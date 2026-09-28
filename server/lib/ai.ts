import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { notifyOwnerCritical } from "../services/notify.js";
import { logger } from "../logger.js";

const GEMINI_MODEL = "gemini-3.8-flash";
const GROQ_MODEL = "openai/gpt-oss-120b";

function parseKeys(
  raw: string | undefined
): string[] {
  return (raw || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

function getGeminiKeys(): string[] {
  return parseKeys(
    process.env.GEMINI_API_KEY
  );
}

function getGroqKeys(): string[] {
  return parseKeys(
    process.env.GROQ_API_KEY
  );
}

let geminiIndex = 0;
let groqIndex = 0;

async function askGeminiWithKey(
  apiKey: string,
  message: string,
  systemPrompt: string
): Promise<string> {
  const client = new GoogleGenAI({
    apiKey,
  });

  const response =
    await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: message,
      config: {
        systemInstruction:
          systemPrompt,
      },
    });

  const text =
    response.text || "";

  if (!text) {
    throw new Error(
      "Empty Gemini response"
    );
  }

  return text;
}

async function askGroqWithKey(
  apiKey: string,
  message: string,
  systemPrompt: string
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL:
      "https://api.groq.com/openai/v1",
  });

  const response =
    await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
      }
    );

  const text =
    response.choices[0]?.message
      ?.content || "";

  if (!text) {
    throw new Error(
      "Empty Groq response"
    );
  }

  return text;
}

async function tryProvider(
  keys: string[],
  startIndex: number,
  setIndex: (index: number) => void,
  callFn: (
    key: string,
    message: string,
    systemPrompt: string
  ) => Promise<string>,
  message: string,
  systemPrompt: string,
  providerName: string
): Promise<string | null> {
  if (keys.length === 0) {
    return null;
  }

  for (
    let attempt = 0;
    attempt < keys.length;
    attempt++
  ) {
    const index =
      (startIndex + attempt) %
      keys.length;

    try {
      const result =
        await callFn(
          keys[index],
          message,
          systemPrompt
        );

      setIndex(index);

      return result;
    } catch (err) {
      logger.warn(
        {
          provider:
            providerName,
          keyIndex: index,
          err:
            err instanceof Error
              ? err.message
              : String(err),
        },
        `${providerName} key failed, trying next`
      );
    }
  }

  return null;
}

export async function askAI(
  message: string,
  systemPrompt: string
): Promise<string> {
  const geminiKeys =
    getGeminiKeys();

  const groqKeys =
    getGroqKeys();

  const geminiResult =
    await tryProvider(
      geminiKeys,
      geminiIndex,
      (index) => {
        geminiIndex = index;
      },
      askGeminiWithKey,
      message,
      systemPrompt,
      "Gemini"
    );

  if (geminiResult) {
    return geminiResult;
  }

  const groqResult =
    await tryProvider(
      groqKeys,
      groqIndex,
      (index) => {
        groqIndex = index;
      },
      askGroqWithKey,
      message,
      systemPrompt,
      "Groq"
    );

  if (groqResult) {
    return groqResult;
  }

  logger.error(
    "All AI providers/keys failed"
  );

  await notifyOwnerCritical(
    "⚠️ AI assistant: every Gemini and Groq API key failed. Check key validity/quotas."
  ).catch(() => {});

  return "Sorry, I'm having trouble responding right now. Please try again shortly, or contact support directly.";
}

export interface OwnerAdminRequest {
  action:
    | "lookup"
    | "stats"
    | "flags"
    | "disable"
    | "enable"
    | "unban";

  email?: string;
  key?: string;

  /** Phone digits for unban. */
  phone?: string;
}

export interface ParsedAIReply {
  text: string;
  requestLiveAgent: boolean;

  deployRequest: {
    appName: string;
    sessionVar: string;
    device:
      | "android"
      | "ios";
    isTrial: boolean;
    months: number;
  } | null;

  ownerAdminRequest:
    | OwnerAdminRequest
    | null;
}

export function parseAIReply(
  raw: string
): ParsedAIReply {
  let text = raw;

  let requestLiveAgent =
    false;

  let deployRequest:
    ParsedAIReply["deployRequest"] =
      null;

  let ownerAdminRequest:
    OwnerAdminRequest | null =
      null;

  if (
    text.includes(
      "[[REQUEST_LIVE_AGENT]]"
    )
  ) {
    requestLiveAgent = true;

    text = text
      .replace(
        "[[REQUEST_LIVE_AGENT]]",
        ""
      )
      .trim();
  }

  const deployMatch =
    text.match(
      /\[\[DEPLOY_BOT:(\{.*?\})\]\]/s
    );

  if (deployMatch) {
    try {
      const parsed =
        JSON.parse(
          deployMatch[1]
        );

      if (
        parsed &&
        typeof parsed.appName ===
          "string" &&
        typeof parsed.sessionVar ===
          "string"
      ) {
        deployRequest = {
          appName:
            parsed.appName,
          sessionVar:
            parsed.sessionVar,
          device:
            parsed.device === "ios"
              ? "ios"
              : "android",
          isTrial:
            !!parsed.isTrial,
          months:
            Number(parsed.months) ||
            1,
        };
      }
    } catch {
      // Ignore malformed deploy markers.
    }

    text = text
      .replace(
        deployMatch[0],
        ""
      )
      .trim();
  }

  const adminMatch =
    text.match(
      /\[\[OWNER_ADMIN:(\{.*?\})\]\]/s
    );

  if (adminMatch) {
    try {
      const parsed =
        JSON.parse(
          adminMatch[1]
        ) as {
          action?: string;
          email?: string;
          key?: string;
          phone?: string;
        };

      const action =
        String(
          parsed?.action || ""
        ).toLowerCase();

      /*
       * Financial and payment actions
       * are intentionally excluded in
       * free mode.
       */
      const allowed = [
        "lookup",
        "stats",
        "flags",
        "disable",
        "enable",
        "unban",
      ];

      if (
        allowed.includes(action)
      ) {
        const phoneRaw =
          typeof parsed.phone ===
          "string"
            ? parsed.phone
            : undefined;

        ownerAdminRequest = {
          action:
            action as OwnerAdminRequest["action"],

          email:
            typeof parsed.email ===
            "string"
              ? parsed.email
              : undefined,

          key:
            typeof parsed.key ===
            "string"
              ? parsed.key
              : undefined,

          phone: phoneRaw
            ? phoneRaw.replace(
                /\D/g,
                ""
              )
            : undefined,
        };
      }
    } catch {
      // Ignore malformed admin markers.
    }

    text = text
      .replace(
        adminMatch[0],
        ""
      )
      .trim();
  }

  return {
    text,
    requestLiveAgent,
    deployRequest,
    ownerAdminRequest,
  };
}
