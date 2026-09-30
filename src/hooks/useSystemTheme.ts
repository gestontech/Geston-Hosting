import { useEffect, useState } from "react";

export type SystemTheme = "dark" | "light";

function getSystemTheme(): SystemTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useSystemTheme() {
  const [theme, setTheme] = useState<SystemTheme>(getSystemTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const nextTheme: SystemTheme = media.matches ? "dark" : "light";

      setTheme(nextTheme);

      document.documentElement.classList.toggle(
        "dark",
        nextTheme === "dark",
      );

      document.documentElement.classList.toggle(
        "light",
        nextTheme === "light",
      );

      document.documentElement.style.colorScheme = nextTheme;
    };

    updateTheme();

    media.addEventListener("change", updateTheme);

    return () => {
      media.removeEventListener("change", updateTheme);
    };
  }, []);

  return {
    theme,
    toggle: () => {
      // Le thème est contrôlé par le téléphone.
      // Aucun remplacement manuel n'est effectué.
    },
  };
}
