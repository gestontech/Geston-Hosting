import { describe, it, expect } from "vitest";
import {
  consentPromptText,
  consentDeclinedText,
  consentAcceptedText,
  isConsentAcceptText,
  isConsentDeclineText,
  CONSENT_ACCEPT_ID,
  CONSENT_DECLINE_ID,
} from "../waConsent.js";

describe("consent texts", () => {
  it("prompt includes Accept and Decline options as text", () => {
    const t = consentPromptText();
    expect(t).toMatch(/Accept/i);
    expect(t).toMatch(/Decline/i);
    expect(t).toMatch(/1\. Accept/);
    expect(t).toMatch(/2\. Decline/);
  });

  it("accepted text asks how it can help and mentions menu — no button ids", () => {
    const t = consentAcceptedText();
    expect(t).toMatch(/how can I help/i);
    expect(t).toMatch(/menu/i);
    expect(t).not.toMatch(/menu_plans/);
    expect(t).not.toMatch(/interactive/i);
  });

  it("declined text explains bot will not save messages", () => {
    expect(consentDeclinedText()).toMatch(/declined/i);
  });
});

describe("isConsentAcceptText / isConsentDeclineText", () => {
  it("accepts common accept phrases and button id", () => {
    expect(isConsentAcceptText("accept")).toBe(true);
    expect(isConsentAcceptText("Accept")).toBe(true);
    expect(isConsentAcceptText("yes")).toBe(true);
    expect(isConsentAcceptText("1")).toBe(true);
    expect(isConsentAcceptText(CONSENT_ACCEPT_ID)).toBe(true);
    expect(isConsentAcceptText("maybe")).toBe(false);
  });

  it("accepts common decline phrases and button id", () => {
    expect(isConsentDeclineText("decline")).toBe(true);
    expect(isConsentDeclineText("no")).toBe(true);
    expect(isConsentDeclineText("2")).toBe(true);
    expect(isConsentDeclineText(CONSENT_DECLINE_ID)).toBe(true);
    expect(isConsentDeclineText("ok")).toBe(false);
  });
});
