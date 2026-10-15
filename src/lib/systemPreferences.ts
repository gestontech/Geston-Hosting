const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectLanguage(): SupportedLanguage {
  const languages = [
    ...(navigator.languages || []),
    navigator.language || "",
  ].map((v) => v.toLowerCase());

  if (languages.some((v) => v.startsWith("fr"))) return "fr";
  return "en";
}

function detectTheme(): "light" | "dark" {
  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applySystemPreferences() {
  const language = detectLanguage();
  const theme = detectTheme();
  const root = document.documentElement;

  root.lang = language;
  root.dataset.language = language;
  root.dataset.theme = theme;
  root.classList.remove("light", "dark");
  root.classList.add(theme);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onThemeChange = (event: MediaQueryListEvent) => {
    if (!localStorage.getItem("theme")) {
      const next = event.matches ? "dark" : "light";
      root.dataset.theme = next;
      root.classList.remove("light", "dark");
      root.classList.add(next);
    }
  };

  media.addEventListener?.("change", onThemeChange);

  return () => media.removeEventListener?.("change", onThemeChange);
}
