import { describe, it, expect } from "vitest";
import {
  userMenuButtons,
  adminMenuButtons,
  menuIntroText,
  mapMenuButtonId,
} from "../waMenus.js";

describe("menu buttons", () => {
  it("user menu has plans buy boost contact help", () => {
    const ids = userMenuButtons().map((b) => b.id);
    expect(ids).toEqual([
      "menu_plans",
      "menu_buy",
      "menu_boost",
      "menu_contact",
      "menu_help",
    ]);
  });

  it("admin menu includes stats and flags", () => {
    const ids = adminMenuButtons().map((b) => b.id);
    expect(ids).toContain("menu_stats");
    expect(ids).toContain("menu_flags");
  });
});

describe("menuIntroText", () => {
  it("tells users they can ask anything outside the menu", () => {
    const t = menuIntroText(false);
    expect(t).toMatch(/ask/i);
    expect(t).toMatch(/outside this menu/i);
    expect(t).toMatch(/plans/i);
  });

  it("admin intro mentions flags", () => {
    expect(menuIntroText(true)).toMatch(/flags/i);
  });
});

describe("mapMenuButtonId", () => {
  it("maps numbered replies 1–5 for user menu", () => {
    expect(mapMenuButtonId("1")).toBe("plans");
    expect(mapMenuButtonId("2")).toBe("buy");
    expect(mapMenuButtonId("3")).toBe("boost");
    expect(mapMenuButtonId("4")).toBe("contact");
    expect(mapMenuButtonId("5")).toBe("menu");
  });

  it("maps keywords and button ids", () => {
    expect(mapMenuButtonId("plans")).toBe("plans");
    expect(mapMenuButtonId("menu_plans")).toBe("plans");
    expect(mapMenuButtonId("boost")).toBe("boost");
    expect(mapMenuButtonId("help")).toBe("menu");
    expect(mapMenuButtonId("menu")).toBe("menu");
    expect(mapMenuButtonId("contact")).toBe("contact");
    expect(mapMenuButtonId("stats")).toBe("stats");
    expect(mapMenuButtonId("flags")).toBe("flags");
  });

  it("returns null for unrelated text (so AI can handle)", () => {
    expect(mapMenuButtonId("ok")).toBeNull();
    expect(mapMenuButtonId("hello")).toBeNull();
    expect(mapMenuButtonId("what is tx")).toBeNull();
  });
});
