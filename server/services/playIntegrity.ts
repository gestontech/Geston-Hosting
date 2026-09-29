import crypto from "crypto";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PLAY_INTEGRITY_SCOPE =
  "https://www.googleapis.com/auth/playintegrity";

const PACKAGE_NAME =
  process.env.PLAY_INTEGRITY_PACKAGE_NAME ||
  "online.gestontech.hosting";

const MAX_TOKEN_AGE_MS =
  Number(process.env.PLAY_INTEGRITY_MAX_TOKEN_AGE_MS) ||
  5 * 60 * 1000;

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface IntegrityPayload {
  requestDetails?: {
    requestPackageName?: string;
    nonce?: string;
    timestampMillis?: string | number;
  };
  accountDetails?: {
    appLicensingVerdict?: string;
  };
  appIntegrity?: {
    appRecognitionVerdict?: string;
    packageName?: string;
    versionCode?: string;
    certificateSha256Digest?: string[];
  };
}

function getServiceAccount(): ServiceAccountCredentials {
  const raw = process.env.PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON is not configured"
    );
  }

  let parsed: ServiceAccountCredentials;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON is invalid JSON"
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "Google service account is missing client_email or private_key"
    );
  }

  return parsed;
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getGoogleAccessToken(): Promise<string> {
  const credentials = getServiceAccount();

  const now = Math.floor(Date.now() / 1000);

  const header = base64Url(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
    })
  );

  const claimSet = base64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: GOOGLE_PLAY_INTEGRITY_SCOPE,
      aud: credentials.token_uri || GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const unsignedToken = `${header}.${claimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign(credentials.private_key);

  const assertion =
    `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch(
    credentials.token_uri || GOOGLE_TOKEN_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type:
          "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Google OAuth token request failed (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
  };

  if (!data.access_token) {
    throw new Error(
      "Google OAuth response did not contain an access token"
    );
  }

  return data.access_token;
}

export async function decodeIntegrityToken(
  integrityToken: string
): Promise<IntegrityPayload> {
  if (!integrityToken || integrityToken.length < 20) {
    throw new Error("Invalid integrity token");
  }

  const accessToken =
    await getGoogleAccessToken();

  const endpoint =
    `https://playintegrity.googleapis.com/v1/` +
    `${encodeURIComponent(PACKAGE_NAME)}` +
    `:decodeIntegrityToken`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      integrity_token: integrityToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Google Play Integrity verification failed (${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as {
    tokenPayloadExternal?: IntegrityPayload;
  };

  if (!data.tokenPayloadExternal) {
    throw new Error(
      "Google Play did not return tokenPayloadExternal"
    );
  }

  return data.tokenPayloadExternal;
}

export function validateIntegrityPayload(
  payload: IntegrityPayload,
  expectedNonce: string
): {
  licensed: boolean;
  reason: string;
} {
  const requestDetails =
    payload.requestDetails;

  const accountDetails =
    payload.accountDetails;

  const appIntegrity =
    payload.appIntegrity;

  if (!requestDetails) {
    return {
      licensed: false,
      reason: "Missing requestDetails",
    };
  }

  if (
    requestDetails.requestPackageName !==
    PACKAGE_NAME
  ) {
    return {
      licensed: false,
      reason: "Invalid application package",
    };
  }

  if (
    requestDetails.nonce !==
    expectedNonce
  ) {
    return {
      licensed: false,
      reason: "Invalid or reused nonce",
    };
  }

  const timestamp =
    Number(requestDetails.timestampMillis);

  if (
    !Number.isFinite(timestamp) ||
    Math.abs(Date.now() - timestamp) >
      MAX_TOKEN_AGE_MS
  ) {
    return {
      licensed: false,
      reason: "Integrity token is too old",
    };
  }

  if (
    appIntegrity?.appRecognitionVerdict !==
    "PLAY_RECOGNIZED"
  ) {
    return {
      licensed: false,
      reason: "Application is not recognized by Google Play",
    };
  }

  if (
    appIntegrity.packageName &&
    appIntegrity.packageName !== PACKAGE_NAME
  ) {
    return {
      licensed: false,
      reason: "Application package mismatch",
    };
  }

  if (
    accountDetails?.appLicensingVerdict !==
    "LICENSED"
  ) {
    return {
      licensed: false,
      reason:
        "Google Play account has no licence for this application",
    };
  }

  return {
    licensed: true,
    reason: "Google Play licence verified",
  };
}

export function createPlayNonce(): string {
  return base64Url(
    crypto.randomBytes(32)
  );
}

export function getPlayPackageName(): string {
  return PACKAGE_NAME;
}
