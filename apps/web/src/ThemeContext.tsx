import React from "react";

export type Theme = "light" | "dark";

export const ThemeContext = React.createContext<{
  theme: Theme;
  toggle(): void;
}>({
  theme: "light",
  toggle: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
};

