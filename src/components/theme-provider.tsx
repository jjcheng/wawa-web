"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  themes: Theme[];
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: Dispatch<SetStateAction<string>>;
  forcedTheme?: string;
};

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "system";
const THEME_VALUES = ["light", "dark", "system"] as const;
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme() {
  if (typeof window === "undefined") return DEFAULT_THEME;
  return isTheme(window.localStorage.getItem(STORAGE_KEY))
    ? window.localStorage.getItem(STORAGE_KEY) as Theme
    : DEFAULT_THEME;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function disableTransitions() {
  const style = document.createElement("style");
  style.appendChild(document.createTextNode("*{transition:none!important}"));
  document.head.appendChild(style);
  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => style.remove(), 1);
  };
}

function applyTheme(theme: Theme, systemTheme: ResolvedTheme, disableTransitionOnChange: boolean) {
  const resolvedTheme = theme === "system" ? systemTheme : theme;
  const enableTransitions = disableTransitionOnChange ? disableTransitions() : null;

  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(resolvedTheme);
  document.documentElement.style.colorScheme = resolvedTheme;
  enableTransitions?.();
}

export function ThemeProvider({
  children,
  disableTransitionOnChange = false,
}: {
  children: ReactNode;
  attribute?: "class";
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(media.matches ? "dark" : "light");
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setThemeState(isTheme(event.newValue) ? event.newValue : DEFAULT_THEME);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    applyTheme(theme, systemTheme, disableTransitionOnChange);
  }, [disableTransitionOnChange, systemTheme, theme]);

  const setTheme: Dispatch<SetStateAction<string>> = (value) => {
    setThemeState((current) => {
      const nextValue = typeof value === "function" ? value(current) : value;
      const nextTheme = isTheme(nextValue) ? nextValue : DEFAULT_THEME;
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  };

  const contextValue = useMemo<ThemeContextValue>(() => ({
    themes: [...THEME_VALUES],
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
  }), [resolvedTheme, systemTheme, theme]);

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
