export type ThemePreference = "system" | "light" | "dark";

const THEME_KEY = "theme";

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

export function applySystemPreferences(): void {
  applyTheme();
}

export function watchSystemPreferences(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onThemeChange = () => {
    if (getThemePreference() === "system") applyTheme("system");
  };

  media.addEventListener?.("change", onThemeChange);

  return () => {
    media.removeEventListener?.("change", onThemeChange);
  };
}
