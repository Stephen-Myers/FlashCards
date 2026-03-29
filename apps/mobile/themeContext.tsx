import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_PREF_KEY = "flashcards:prefer-dark";

export type ThemeColors = {
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  headerBg: string;
  headerTint: string;
  placeholder: string;
  inputSurface: string;
  muted: string;
  listItemButtonBg: string;
};

const lightColors: ThemeColors = {
  background: "#ffffff",
  text: "#000000",
  textSecondary: "rgba(0, 0, 0, 0.65)",
  border: "#cccccc",
  headerBg: "#ffffff",
  headerTint: "#000000",
  placeholder: "#999999",
  inputSurface: "#ffffff",
  muted: "#888888",
  listItemButtonBg: "#f5f5f7"
};

const darkColors: ThemeColors = {
  background: "#000000",
  text: "#ffffff",
  textSecondary: "rgba(255, 255, 255, 0.65)",
  border: "#38383a",
  headerBg: "#1c1c1e",
  headerTint: "#ffffff",
  placeholder: "#8e8e93",
  inputSurface: "#1c1c1e",
  muted: "#8e8e93",
  listItemButtonBg: "#1c1c1e"
};

type ThemeContextValue = {
  isDark: boolean;
  colors: ThemeColors;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(DARK_PREF_KEY).then((stored) => {
      if (stored === "1") setIsDark(true);
    });
  }, []);

  const setDarkMode = React.useCallback((value: boolean) => {
    setIsDark(value);
    void AsyncStorage.setItem(DARK_PREF_KEY, value ? "1" : "0");
  }, []);

  const colors = isDark ? darkColors : lightColors;

  const value = React.useMemo(
    () => ({ isDark, colors, setDarkMode }),
    [isDark, colors, setDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }
  return ctx;
}
