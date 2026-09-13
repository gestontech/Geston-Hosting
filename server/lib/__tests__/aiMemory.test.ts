import { describe, it, expect, beforeEach } from "vitest";
import {
  getMemoryTurns,
  appendMemory,
  formatMemoryForPrompt,
  clearMemory,
} from "../aiMemory.js";

const USER = "wa:254700000001";

beforeEach(() => {
  clearMemory(USER);
  clearMemory("other");
});

describe("aiMemory", () => {
  it("starts empty for unknown users", () => {
    expect(getMemoryTurns(USER)).toEqual([]);
    expect(formatMemoryForPrompt(USER)).toBe("");
  });

  it("appends user and assistant turns in order", () => {
    appendMemory(USER, "user", "hi");
    appendMemory(USER, "assistant", "hello");
    const turns = getMemoryTurns(USER);
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ role: "user", content: "hi" });
    expect(turns[1]).toMatchObject({ role: "assistant", content: "hello" });
  });

  it("isolates memory by userLabel", () => {
    appendMemory(USER, "user", "mine");
    appendMemory("other", "user", "theirs");
    expect(getMemoryTurns(USER).map((t) => t.content)).toEqual(["mine"]);
    expect(getMemoryTurns("other").map((t) => t.content)).toEqual(["theirs"]);
  });

  it("ignores empty userLabel or blank content", () => {
    appendMemory("", "user", "nope");
    appendMemory(USER, "user", "   ");
    expect(getMemoryTurns(USER)).toEqual([]);
  });

  it("truncates very long content to 1500 chars", () => {
    const long = "x".repeat(2000);
    appendMemory(USER, "user", long);
    expect(getMemoryTurns(USER)[0].content).toHaveLength(1500);
  });

  it("caps at MAX_TURNS (24)", () => {
    for (let i = 0; i < 30; i++) {
      appendMemory(USER, i % 2 === 0 ? "user" : "assistant", "msg" + i);
    }
    const turns = getMemoryTurns(USER);
    expect(turns.length).toBe(24);
    expect(turns[0].content).toBe("msg6");
    expect(turns[23].content).toBe("msg29");
  });

  it("clearMemory removes only that user", () => {
    appendMemory(USER, "user", "a");
    appendMemory("other", "user", "b");
    clearMemory(USER);
    expect(getMemoryTurns(USER)).toEqual([]);
    expect(getMemoryTurns("other")).toHaveLength(1);
  });

  it("formatMemoryForPrompt includes prior turns and current-message marker", () => {
    appendMemory(USER, "user", "plans?");
    appendMemory(USER, "assistant", "Here are the plans.");
    const formatted = formatMemoryForPrompt(USER);
    expect(formatted).toContain("Previous conversation");
    expect(formatted).toContain("User: plans?");
    expect(formatted).toContain("Assistant: Here are the plans.");
    expect(formatted).toContain("Current message:");
  });
});
