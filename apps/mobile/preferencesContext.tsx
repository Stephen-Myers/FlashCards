import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DELETE_MODE_KEY = "flashcards:deck-list-delete-mode";
const STUDY_FULL_MIX_KEY = "flashcards:study-full-mix";
const DECK_DETAIL_CONDENSED_KEY = "flashcards:deck-detail-condensed";
const STUDY_SESSION_MAX_CARDS_KEY = "flashcards:study-session-max-cards";

type PreferencesContextValue = {
  deckListDeleteMode: boolean;
  setDeckListDeleteMode: (value: boolean) => void;
  studyFullMix: boolean;
  setStudyFullMix: (value: boolean) => void;
  deckDetailCondensedCards: boolean;
  setDeckDetailCondensedCards: (value: boolean) => void;
  /** Max study slides per session; `null` = no limit (all cards). */
  studySessionMaxCards: number | null;
  setStudySessionMaxCards: (value: number | null) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [deckListDeleteMode, setDeckListDeleteModeState] = React.useState(false);
  const [studyFullMix, setStudyFullMixState] = React.useState(false);
  const [deckDetailCondensedCards, setDeckDetailCondensedCardsState] = React.useState(false);
  const [studySessionMaxCards, setStudySessionMaxCardsState] = React.useState<number | null>(null);

  React.useEffect(() => {
    AsyncStorage.getItem(DELETE_MODE_KEY).then((stored) => {
      if (stored === "1") setDeckListDeleteModeState(true);
    });
    AsyncStorage.getItem(STUDY_FULL_MIX_KEY).then((stored) => {
      if (stored === "1") setStudyFullMixState(true);
    });
    AsyncStorage.getItem(DECK_DETAIL_CONDENSED_KEY).then((stored) => {
      if (stored === "1") setDeckDetailCondensedCardsState(true);
    });
    AsyncStorage.getItem(STUDY_SESSION_MAX_CARDS_KEY).then((stored) => {
      if (stored == null || stored === "") {
        setStudySessionMaxCardsState(null);
        return;
      }
      const n = parseInt(stored, 10);
      setStudySessionMaxCardsState(Number.isNaN(n) || n <= 0 ? null : n);
    });
  }, []);

  const setDeckListDeleteMode = React.useCallback((value: boolean) => {
    setDeckListDeleteModeState(value);
    void AsyncStorage.setItem(DELETE_MODE_KEY, value ? "1" : "0");
  }, []);

  const setStudyFullMix = React.useCallback((value: boolean) => {
    setStudyFullMixState(value);
    void AsyncStorage.setItem(STUDY_FULL_MIX_KEY, value ? "1" : "0");
  }, []);

  const setDeckDetailCondensedCards = React.useCallback((value: boolean) => {
    setDeckDetailCondensedCardsState(value);
    void AsyncStorage.setItem(DECK_DETAIL_CONDENSED_KEY, value ? "1" : "0");
  }, []);

  const setStudySessionMaxCards = React.useCallback((value: number | null) => {
    setStudySessionMaxCardsState(value);
    void AsyncStorage.setItem(
      STUDY_SESSION_MAX_CARDS_KEY,
      value == null || value <= 0 ? "" : String(Math.floor(value))
    );
  }, []);

  const value = React.useMemo(
    () => ({
      deckListDeleteMode,
      setDeckListDeleteMode,
      studyFullMix,
      setStudyFullMix,
      deckDetailCondensedCards,
      setDeckDetailCondensedCards,
      studySessionMaxCards,
      setStudySessionMaxCards
    }),
    [
      deckListDeleteMode,
      setDeckListDeleteMode,
      studyFullMix,
      setStudyFullMix,
      deckDetailCondensedCards,
      setDeckDetailCondensedCards,
      studySessionMaxCards,
      setStudySessionMaxCards
    ]
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
