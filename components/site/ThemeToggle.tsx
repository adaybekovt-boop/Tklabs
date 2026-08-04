"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "tklabs-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ lightLabel, darkLabel }: { lightLabel: string; darkLabel: string }) {
  const [theme, setTheme] = useState<Theme>(() => (
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light"
  ));

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme: Theme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? lightLabel : darkLabel}
      aria-pressed={isDark}
      title={isDark ? lightLabel : darkLabel}
    >
      {isDark ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
    </button>
  );
}
