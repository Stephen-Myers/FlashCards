import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_PREF_KEY = "flashcards:prefer-dark";
const ACCENT_PREF_KEY = "flashcards:accent-id";

export type ThemeAccentId =
  | "blue"
  | "green"
  | "mint"
  | "teal"
  | "indigo"
  | "purple"
  | "pink"
  | "orange"
  | "gold";

/** Ordered for the settings color grid (left → right, top → bottom). */
export const THEME_ACCENTS: { id: ThemeAccentId; color: string }[] = [
  { id: "blue", color: "#007AFF" },
  { id: "green", color: "#34C759" },
  { id: "mint", color: "#00C7BE" },
  { id: "teal", color: "#5AC8FA" },
  { id: "indigo", color: "#5856D6" },
  { id: "purple", color: "#AF52DE" },
  { id: "pink", color: "#FF2D55" },
  { id: "orange", color: "#FF9500" },
  { id: "gold", color: "#FFCC00" }
];

const DEFAULT_ACCENT_ID: ThemeAccentId = "blue";

export function getAccentColor(id: ThemeAccentId | string): string {
  const found = THEME_ACCENTS.find((a) => a.id === id);
  return found?.color ?? THEME_ACCENTS[0].color;
}

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
  accent: string;
};

type ThemeColorPrimitives = Omit<ThemeColors, "accent">;

const lightColorPrimitives: ThemeColorPrimitives = {
  background: "#ffffff",
  text: "#000000",
  textSecondary: "rgba(0, 0, 0, 0.65)",
  border: "#cccccc",
  headerBg: "#1c1c1e",
  headerTint: "#ffffff",
  placeholder: "#999999",
  inputSurface: "#ffffff",
  muted: "#888888",
  listItemButtonBg: "#f5f5f7"
};

const darkColorPrimitives: ThemeColorPrimitives = {
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
  accentId: ThemeAccentId;
  setDarkMode: (value: boolean) => void;
  setAccentId: (id: ThemeAccentId) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isThemeAccentId(value: string): value is ThemeAccentId {
  return THEME_ACCENTS.some((a) => a.id === value);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = React.useState(false);
  const [accentId, setAccentIdState] = React.useState<ThemeAccentId>(DEFAULT_ACCENT_ID);

  React.useEffect(() => {
    AsyncStorage.getItem(DARK_PREF_KEY).then((stored) => {
      if (stored === "1") setIsDark(true);
    });
    AsyncStorage.getItem(ACCENT_PREF_KEY).then((stored) => {
      if (stored && isThemeAccentId(stored)) setAccentIdState(stored);
    });
  }, []);

  const setDarkMode = React.useCallback((value: boolean) => {
    setIsDark(value);
    void AsyncStorage.setItem(DARK_PREF_KEY, value ? "1" : "0");
  }, []);

  const setAccentId = React.useCallback((id: ThemeAccentId) => {
    setAccentIdState(id);
    void AsyncStorage.setItem(ACCENT_PREF_KEY, id);
  }, []);

  const colors = React.useMemo<ThemeColors>(
    () => ({
      ...(isDark ? darkColorPrimitives : lightColorPrimitives),
      accent: getAccentColor(accentId)
    }),
    [isDark, accentId]
  );

  const value = React.useMemo(
    () => ({ isDark, colors, accentId, setDarkMode, setAccentId }),
    [isDark, colors, accentId, setDarkMode, setAccentId]
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
