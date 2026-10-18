export type ThemePreference = "system" | "light" | "dark";

export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const THEME_KEY = "theme";
const LANGUAGE_KEY = "language";

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export function getResolvedTheme(preference: ThemePreference = getThemePreference()): "light" | "dark" {
  return preference === "system" ? getSystemTheme() : preference;
}

export function applyTheme(preference: ThemePreference = getThemePreference()): void {
  const resolved = getResolvedTheme(preference);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

export function detectLanguage(): SupportedLanguage {
  if (typeof navigator === "undefined") return "fr";

  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const value of candidates) {
    const language = value?.toLowerCase().split("-")[0];
    if (language === "fr" || language === "en") return language;
  }
  return "fr";
}

export function getLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "fr";
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "fr" || saved === "en") return saved;
  return detectLanguage();
}

export function applyLanguage(): SupportedLanguage {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.documentElement.dir = "ltr";
  return language;
}

export function applySystemPreferences(): void {
  applyTheme();
  applyLanguage();
}

export function watchSystemPreferences(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onThemeChange = () => {
    if (getThemePreference() === "system") applyTheme("system");
  };
  const onLanguageChange = () => {
    if (!localStorage.getItem(LANGUAGE_KEY)) applyLanguage();
  };

  media.addEventListener?.("change", onThemeChange);
  window.addEventListener("languagechange", onLanguageChange);

  return () => {
    media.removeEventListener?.("change", onThemeChange);
    window.removeEventListener("languagechange", onLanguageChange);
  };
}
