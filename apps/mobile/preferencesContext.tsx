import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DELETE_MODE_KEY = "flashcards:deck-list-delete-mode";

type PreferencesContextValue = {
  deckListDeleteMode: boolean;
  setDeckListDeleteMode: (value: boolean) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [deckListDeleteMode, setDeckListDeleteModeState] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(DELETE_MODE_KEY).then((stored) => {
      if (stored === "1") setDeckListDeleteModeState(true);
    });
  }, []);

  const setDeckListDeleteMode = React.useCallback((value: boolean) => {
    setDeckListDeleteModeState(value);
    void AsyncStorage.setItem(DELETE_MODE_KEY, value ? "1" : "0");
  }, []);

  const value = React.useMemo(
    () => ({ deckListDeleteMode, setDeckListDeleteMode }),
    [deckListDeleteMode, setDeckListDeleteMode]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}
