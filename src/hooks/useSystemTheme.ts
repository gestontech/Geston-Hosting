import { useEffect, useState } from "react";

export type SystemTheme = "dark" | "light";

function getSystemTheme(): SystemTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useSystemTheme(): SystemTheme {
  const [theme, setTheme] = useState<SystemTheme>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (isDark: boolean) => {
      const nextTheme: SystemTheme = isDark ? "dark" : "light";

      setTheme(nextTheme);

      const root = document.documentElement;

      root.classList.remove("dark", "light");
      root.classList.add(nextTheme);
      root.style.colorScheme = nextTheme;
    };

    applyTheme(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  return theme;
}

export default useSystemTheme;
