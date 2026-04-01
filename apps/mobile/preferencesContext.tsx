import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DELETE_MODE_KEY = "flashcards:deck-list-delete-mode";
const STUDY_FULL_MIX_KEY = "flashcards:study-full-mix";
const DECK_DETAIL_CONDENSED_KEY = "flashcards:deck-detail-condensed";
const STUDY_SESSION_MAX_CARDS_KEY = "flashcards:study-session-max-cards";
const STUDY_TYPE_IT_IN_KEY = "flashcards:study-type-it-in";
const STUDY_REVERSE_SIDES_KEY = "flashcards:study-reverse-sides";
const STUDY_TIMED_MODE_KEY = "flashcards:study-timed-mode";

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
  /** Study by typing the back of the card instead of Got it / Didn't get it. */
  studyTypeItIn: boolean;
  setStudyTypeItIn: (value: boolean) => void;
  /** Study with displayed front/back swapped relative to how the card is stored. */
  studyReverseSides: boolean;
  setStudyReverseSides: (value: boolean) => void;
  /** Track response time; summary buckets vs session average (easy/normal/hard). */
  studyTimedMode: boolean;
  setStudyTimedMode: (value: boolean) => void;
};

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [deckListDeleteMode, setDeckListDeleteModeState] = React.useState(false);
  const [studyFullMix, setStudyFullMixState] = React.useState(false);
  const [deckDetailCondensedCards, setDeckDetailCondensedCardsState] = React.useState(false);
  const [studySessionMaxCards, setStudySessionMaxCardsState] = React.useState<number | null>(null);
  const [studyTypeItIn, setStudyTypeItInState] = React.useState(false);
  const [studyReverseSides, setStudyReverseSidesState] = React.useState(false);
  const [studyTimedMode, setStudyTimedModeState] = React.useState(false);

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
    AsyncStorage.getItem(STUDY_TYPE_IT_IN_KEY).then((stored) => {
      if (stored === "1") setStudyTypeItInState(true);
    });
    AsyncStorage.getItem(STUDY_REVERSE_SIDES_KEY).then((stored) => {
      if (stored === "1") setStudyReverseSidesState(true);
    });
    AsyncStorage.getItem(STUDY_TIMED_MODE_KEY).then((stored) => {
      if (stored === "1") setStudyTimedModeState(true);
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

  const setStudyTypeItIn = React.useCallback((value: boolean) => {
    setStudyTypeItInState(value);
    void AsyncStorage.setItem(STUDY_TYPE_IT_IN_KEY, value ? "1" : "0");
  }, []);

  const setStudyReverseSides = React.useCallback((value: boolean) => {
    setStudyReverseSidesState(value);
    void AsyncStorage.setItem(STUDY_REVERSE_SIDES_KEY, value ? "1" : "0");
  }, []);

  const setStudyTimedMode = React.useCallback((value: boolean) => {
    setStudyTimedModeState(value);
    void AsyncStorage.setItem(STUDY_TIMED_MODE_KEY, value ? "1" : "0");
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
      setStudySessionMaxCards,
      studyTypeItIn,
      setStudyTypeItIn,
      studyReverseSides,
      setStudyReverseSides,
      studyTimedMode,
      setStudyTimedMode
    }),
    [
      deckListDeleteMode,
      setDeckListDeleteMode,
      studyFullMix,
      setStudyFullMix,
      deckDetailCondensedCards,
      setDeckDetailCondensedCards,
      studySessionMaxCards,
      setStudySessionMaxCards,
      studyTypeItIn,
      setStudyTypeItIn,
      studyReverseSides,
      setStudyReverseSides,
      studyTimedMode,
      setStudyTimedMode
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
