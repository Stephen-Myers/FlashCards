import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal
} from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import { usePreferences } from "../preferencesContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";
import { getNextReview, shuffleStudyQueue, shuffleStudyQueueFully } from "@flashcards/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Nav = NativeStackNavigationProp<RootStackParamList, "Review">;
type ReviewRoute = RouteProp<RootStackParamList, "Review">;

type TimedBucketEntry = { card: Card; responseMs: number; gotIt: boolean };
type TimedSessionSummary = {
  easy: number;
  normal: number;
  hard: number;
  meanMs: number;
  easyCards: TimedBucketEntry[];
  normalCards: TimedBucketEntry[];
  hardCards: TimedBucketEntry[];
};
type TimedBucketKey = "easy" | "normal" | "hard";

const OUTLINE_DIDNT_GET = "#ff3b30";
const OUTLINE_GOT_IT = "#34c759";
/** Timed summary “Normal” bucket (at session mean). */
const TIMED_NORMAL_COLOR = "#ff9500";
const CARD_IMAGE_HEIGHT = 200;

/**
 * Type-it-in + keyboard: never tie card maxHeight to `keyboardHeight` — it updates in one frame while
 * KeyboardAvoidingView animates, so the panel looks like it “snaps shut” from the bottom. Portrait cap is a
 * fixed fraction of the (full) window; when the keyboard opens, flex + shrinking parent height reduce the card
 * smoothly. Tune TYPEIN_PORTRAIT_TYPEIN_CARD_MAX_FRAC / TYPEIN_LANDSCAPE_TYPEIN_PANEL_FRAC if needed.
 *
 * iOS KeyboardAvoidingView: `keyboardVerticalOffset` includes the header stack plus extra for the QuickType /
 * spell-check strip above the keys, which is easy to under-account for vs keyboard frame height alone.
 */
const IOS_KEYBOARD_VERTICAL_HEADER = 55;
/** Extra lift on iOS so inputs clear the predictive/spell-check bar (~36–44pt typical). */
const IOS_KEYBOARD_QUICKTYPE_BUFFER = 25;
const TYPEIN_PORTRAIT_TYPEIN_CARD_MAX_FRAC = 0.42;
const TYPEIN_LANDSCAPE_TYPEIN_PANEL_FRAC = 0.3;
/**
 * Extra space under the correct/your answer blocks. Applied in a sibling **below** KeyboardAvoidingView so it
 * tracks the real bottom of the screen — padding inside KAV sits above the keyboard and reads as “distance
 * from keyboard” instead of home-indicator space.
 */
const REVIEW_TYPEIN_COMPARISON_BOTTOM_BUFFER = 24;

type QueuedCard = {
  card: Card;
  /**
   * When Full mix is on: flip mode shows this side first; type-it-in shows it as the **prompt** and the user
   * types the **other** side (back prompt → type front; front prompt → type back).
   */
  answerFirst: boolean;
  /** Original card ids this slide updates (one id, or several for a combined session-only card). */
  sourceCardIds: string[];
};

function mergeCardGroup(group: Card[], separator: string): Card {
  const first = group[0];
  const now = new Date().toISOString();
  const id = `__session_combine__:${group.map((c) => c.id).join(":")}`;
  return {
    ...first,
    id,
    frontText: group.map((c) => c.frontText ?? "").join(separator),
    backText: group.map((c) => c.backText ?? "").join(separator),
    updatedAt: now
  };
}

function buildStudyQueue(
  cards: Card[],
  studyFullMix: boolean,
  combineGroupSize: number,
  combineSeparator: string
): QueuedCard[] {
  const ordered = studyFullMix ? shuffleStudyQueueFully(cards) : shuffleStudyQueue(cards);
  const size = Math.min(5, Math.max(1, combineGroupSize));
  const sep = combineSeparator;

  if (size <= 1) {
    return ordered.map((card) => ({
      card,
      answerFirst: studyFullMix && Math.random() < 0.5,
      sourceCardIds: [card.id]
    }));
  }

  const result: QueuedCard[] = [];
  for (let i = 0; i < ordered.length; i += size) {
    const chunk = ordered.slice(i, i + size);
    const answerFirst = studyFullMix && Math.random() < 0.5;
    if (chunk.length === 1) {
      result.push({
        card: chunk[0],
        answerFirst,
        sourceCardIds: [chunk[0].id]
      });
    } else {
      result.push({
        card: mergeCardGroup(chunk, sep),
        answerFirst,
        sourceCardIds: chunk.map((c) => c.id)
      });
    }
  }
  return result;
}

/** Trim and collapse whitespace; grading ignores letter case (see answersMatchForGrading). */
function normalizeForGradingCompare(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function answersMatchForGrading(typed: string, expected: string): boolean {
  return (
    normalizeForGradingCompare(typed).localeCompare(normalizeForGradingCompare(expected), "en", {
      sensitivity: "accent"
    }) === 0
  );
}

/** Text for the displayed “front” / “back” of the card; when `reverse`, stored sides are swapped for study only. */
function viewFaceText(card: Card, reverse: boolean, face: "front" | "back"): string | undefined {
  if (reverse) {
    return face === "front" ? card.backText : card.frontText;
  }
  return face === "front" ? card.frontText : card.backText;
}

function viewFaceImageUri(card: Card, reverse: boolean, face: "front" | "back"): string | undefined {
  if (reverse) {
    return face === "front" ? card.backImageUri : card.frontImageUri;
  }
  return face === "front" ? card.frontImageUri : card.backImageUri;
}

/**
 * Expected typed answer for type-it-in: the opposite displayed face from the prompt (Full mix may show either face first).
 */
function getTypeInExpectedRaw(card: Card, answerFirst: boolean, reverse: boolean): string {
  return (answerFirst ? viewFaceText(card, reverse, "front") : viewFaceText(card, reverse, "back")) ?? "";
}

function formatAvgResponseMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms average`;
  return `${(ms / 1000).toFixed(1)} s average`;
}

function formatOneResponseMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Wrong answers always go to Hard. Correct answers: Normal = average ± (a third of the average);
 * faster than the lower edge → Easy; slower than the upper edge → Hard.
 * Pairings align `msList[i]` with `cardsInOrder[i]` (same order as the study queue).
 */
function buildTimedSessionDetail(
  msList: number[],
  gotItList: boolean[],
  cardsInOrder: Card[]
): TimedSessionSummary {
  const n = Math.min(msList.length, cardsInOrder.length, gotItList.length);
  const pairs: TimedBucketEntry[] = [];
  for (let i = 0; i < n; i++) {
    pairs.push({
      card: cardsInOrder[i],
      responseMs: msList[i],
      gotIt: gotItList[i]
    });
  }
  if (pairs.length === 0) {
    return {
      easy: 0,
      normal: 0,
      hard: 0,
      meanMs: 0,
      easyCards: [],
      normalCards: [],
      hardCards: []
    };
  }
  const times = pairs.map((p) => p.responseMs);
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const bufferMs = mean / 3;
  const normalLow = mean - bufferMs;
  const normalHigh = mean + bufferMs;
  const easyCards: TimedBucketEntry[] = [];
  const normalCards: TimedBucketEntry[] = [];
  const hardCards: TimedBucketEntry[] = [];
  for (const p of pairs) {
    if (!p.gotIt) {
      hardCards.push(p);
      continue;
    }
    const t = p.responseMs;
    if (t < normalLow) easyCards.push(p);
    else if (t > normalHigh) hardCards.push(p);
    else normalCards.push(p);
  }
  return {
    easy: easyCards.length,
    normal: normalCards.length,
    hard: hardCards.length,
    meanMs: mean,
    easyCards,
    normalCards,
    hardCards
  };
}

export const ReviewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const { colors } = useAppTheme();
  const FAB_COLOR = colors.accent;
  const { studyFullMix, studySessionMaxCards, studyTypeItIn, studyReverseSides, studyTimedMode } =
    usePreferences();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReviewRoute>();
  const { deckId, combineGroupSize: combineGroupSizeParam, combineSeparator: combineSeparatorParam } = route.params;
  const combineGroupSize = combineGroupSizeParam ?? 1;
  const combineSeparator = combineSeparatorParam ?? "";

  const [queue, setQueue] = React.useState<QueuedCard[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);
  /** Got it / Didn't get it stay hidden until the user taps the card; further taps do not hide them. */
  const [ratingsVisible, setRatingsVisible] = React.useState(false);
  const [ratingCounts, setRatingCounts] = React.useState({ gotIt: 0, didntGetIt: 0 });
  const [timedSessionSummary, setTimedSessionSummary] = React.useState<TimedSessionSummary | null>(null);
  const [timedBucketModal, setTimedBucketModal] = React.useState<TimedBucketKey | null>(null);
  const [sessionComplete, setSessionComplete] = React.useState(false);
  const [typedAnswer, setTypedAnswer] = React.useState("");
  const [typeSubmitted, setTypeSubmitted] = React.useState(false);
  const typeInputRef = React.useRef<TextInput>(null);
  /** Captured on Submit so grading matches the card / direction shown even if queue or index changes before "next". */
  const typeInScoringRef = React.useRef<{ expectedRaw: string; typed: string } | null>(null);
  const queueRef = React.useRef(queue);
  queueRef.current = queue;
  const currentIndexRef = React.useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const cardTimerStartedAtRef = React.useRef<number | null>(null);
  const sessionResponseMsRef = React.useRef<number[]>([]);
  const sessionGotItRef = React.useRef<boolean[]>([]);

  React.useEffect(() => {
    storage.cards.getCardsForDeck(deckId).then((cards) => {
      let built = buildStudyQueue(cards, studyFullMix, combineGroupSize, combineSeparator);
      if (studySessionMaxCards != null && studySessionMaxCards > 0) {
        built = built.slice(0, studySessionMaxCards);
      }
      typeInScoringRef.current = null;
      sessionResponseMsRef.current = [];
      sessionGotItRef.current = [];
      setTimedSessionSummary(null);
      setQueue(built);
      setCurrentIndex(0);
      setShowBack(studyTypeItIn ? false : (built[0]?.answerFirst ?? false));
      setRatingsVisible(studyTypeItIn && built.length > 0);
      setTypedAnswer("");
      setTypeSubmitted(false);
      setRatingCounts({ gotIt: 0, didntGetIt: 0 });
      setSessionComplete(false);
    });
  }, [storage, deckId, studyFullMix, studySessionMaxCards, combineGroupSize, combineSeparator, studyTypeItIn]);

  React.useEffect(() => {
    if (!studyTimedMode || sessionComplete || queue.length === 0) return;
    cardTimerStartedAtRef.current = Date.now();
  }, [studyTimedMode, sessionComplete, currentIndex, queue.length]);

  const currentEntry = queue[currentIndex];
  const currentCard = currentEntry?.card;

  const handleRating = React.useCallback(
    async (rating: "hard" | "easy") => {
      const entry = currentEntry;
      const card = currentCard;
      const idx = currentIndex;
      const q = queue;
      if (!entry || !card) {
        navigation.goBack();
        return;
      }
      const timerStart = cardTimerStartedAtRef.current;
      const responseMs =
        studyTimedMode && timerStart != null ? Date.now() - timerStart : null;
      for (const id of entry.sourceCardIds) {
        const c = await storage.cards.getCard(id);
        if (!c) continue;
        const update = getNextReview(c, { type: rating });
        await storage.cards.saveCard(update.updatedCard);
      }
      if (responseMs != null) {
        sessionResponseMsRef.current.push(responseMs);
        sessionGotItRef.current.push(rating === "easy");
      }
      setRatingCounts((prev) =>
        rating === "easy"
          ? { ...prev, gotIt: prev.gotIt + 1 }
          : { ...prev, didntGetIt: prev.didntGetIt + 1 }
      );
      const nextIndex = idx + 1;
      if (nextIndex >= q.length) {
        if (studyTimedMode && sessionResponseMsRef.current.length > 0) {
          setTimedSessionSummary(
            buildTimedSessionDetail(
              [...sessionResponseMsRef.current],
              [...sessionGotItRef.current],
              q.map((e) => e.card)
            )
          );
        } else {
          setTimedSessionSummary(null);
        }
        setSessionComplete(true);
        setTypedAnswer("");
        setTypeSubmitted(false);
        typeInScoringRef.current = null;
        return;
      }
      setCurrentIndex(nextIndex);
      setShowBack(studyTypeItIn ? false : (q[nextIndex]?.answerFirst ?? false));
      setRatingsVisible(studyTypeItIn);
      setTypedAnswer("");
      setTypeSubmitted(false);
      typeInScoringRef.current = null;
    },
    [currentEntry, currentCard, currentIndex, navigation, queue, storage, studyTypeItIn, studyTimedMode]
  );

  const closeTimedBucketModal = React.useCallback(() => setTimedBucketModal(null), []);

  React.useEffect(() => {
    if (!studyTypeItIn || !ratingsVisible || typeSubmitted || sessionComplete) return;
    const id = requestAnimationFrame(() => {
      typeInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [studyTypeItIn, ratingsVisible, typeSubmitted, sessionComplete, currentIndex]);

  const onTypeSubmit = React.useCallback(() => {
    Keyboard.dismiss();
    const entry = queueRef.current[currentIndexRef.current];
    const card = entry?.card;
    if (entry && card) {
      typeInScoringRef.current = {
        expectedRaw: getTypeInExpectedRaw(card, entry.answerFirst, studyReverseSides),
        typed: typedAnswer
      };
    }
    setTypeSubmitted(true);
  }, [typedAnswer, studyReverseSides]);

  const onTypeNext = React.useCallback(() => {
    const latched = typeInScoringRef.current;
    const entry = queueRef.current[currentIndexRef.current];
    const card = entry?.card;
    if (!entry || !card) return;

    let match: boolean;
    if (latched) {
      match = answersMatchForGrading(latched.typed, latched.expectedRaw);
    } else {
      match = answersMatchForGrading(
        typedAnswer,
        getTypeInExpectedRaw(card, entry.answerFirst, studyReverseSides)
      );
    }
    typeInScoringRef.current = null;
    void handleRating(match ? "easy" : "hard");
  }, [typedAnswer, handleRating, studyReverseSides]);

  const onCardPress = React.useCallback(() => {
    if (studyTypeItIn) {
      if (typeSubmitted) {
        onTypeNext();
        return;
      }
      if (ratingsVisible && !typeSubmitted) {
        Keyboard.dismiss();
        return;
      }
      setRatingsVisible(true);
      return;
    }
    setShowBack((prev) => !prev);
    setRatingsVisible(true);
  }, [studyTypeItIn, typeSubmitted, ratingsVisible, onTypeNext]);

  /** While typing — layout uses only window size so it stays in sync with KeyboardAvoidingView’s animation. */
  const inTypeInEntry = studyTypeItIn && ratingsVisible && !typeSubmitted;

  const typeInPortraitCardMaxPx = Math.round(windowHeight * TYPEIN_PORTRAIT_TYPEIN_CARD_MAX_FRAC);

  const cardTapMinHeight = inTypeInEntry
    ? isLandscape
      ? Math.max(72, Math.round(windowHeight * 0.22))
      : Math.max(140, Math.round(windowHeight * 0.28))
    : isLandscape
      ? Math.max(88, Math.round(windowHeight * (ratingsVisible ? 0.28 : 0.42)))
      : Math.max(300, Math.round(windowHeight * (ratingsVisible ? 0.4 : 0.62)));

  const cardImageDisplayHeight =
    inTypeInEntry && !isLandscape
      ? Math.min(120, Math.max(68, Math.round(windowHeight * 0.14)))
      : inTypeInEntry && isLandscape
        ? Math.min(96, Math.max(56, Math.round(windowHeight * 0.12)))
        : isLandscape
          ? Math.min(CARD_IMAGE_HEIGHT, Math.max(72, Math.round(windowHeight * 0.24)))
          : CARD_IMAGE_HEIGHT;

  /** Landscape: shorter panel for type-in; height from window only (no keyboard listener). */
  const landscapeCardPanelHeight =
    inTypeInEntry && isLandscape
      ? Math.max(72, Math.round(windowHeight * TYPEIN_LANDSCAPE_TYPEIN_PANEL_FRAC))
      : Math.round(windowHeight * 0.46);

  const ratingButtonStyle = isLandscape
    ? {
        flex: 1 as const,
        minHeight: 52,
        maxHeight: 64,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignItems: "center" as const,
        justifyContent: "center" as const
      }
    : {
        flex: 1 as const,
        aspectRatio: 1 as const,
        borderRadius: 12,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        paddingHorizontal: 4
      };

  if (sessionComplete && queue.length > 0) {
    const total = queue.length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const ts = timedSessionSummary;
    const useTimedSummary = studyTimedMode && ts != null;
    const rows: Array<{
      label: string;
      subtitle: string;
      count: number;
      percent: number;
      color: string;
      bucketKey?: TimedBucketKey;
    }> = useTimedSummary
      ? [
          {
            label: "Easy",
            subtitle: "Correct, quicker than average minus a third",
            count: ts.easy,
            percent: pct(ts.easy),
            color: OUTLINE_GOT_IT,
            bucketKey: "easy"
          },
          {
            label: "Normal",
            subtitle: "Correct, within average ± a third",
            count: ts.normal,
            percent: pct(ts.normal),
            color: TIMED_NORMAL_COLOR,
            bucketKey: "normal"
          },
          {
            label: "Hard",
            subtitle: "Incorrect, or correct and slower than average plus a third",
            count: ts.hard,
            percent: pct(ts.hard),
            color: OUTLINE_DIDNT_GET,
            bucketKey: "hard"
          }
        ]
      : [
          {
            label: "Got it",
            subtitle: "",
            count: ratingCounts.gotIt,
            percent: pct(ratingCounts.gotIt),
            color: OUTLINE_GOT_IT
          },
          {
            label: "Didn't get it",
            subtitle: "",
            count: ratingCounts.didntGetIt,
            percent: pct(ratingCounts.didntGetIt),
            color: OUTLINE_DIDNT_GET
          }
        ];

    const bucketModalItems =
      useTimedSummary && timedBucketModal != null
        ? timedBucketModal === "easy"
          ? ts.easyCards
          : timedBucketModal === "normal"
            ? ts.normalCards
            : ts.hardCards
        : [];
    const bucketModalTitle =
      timedBucketModal === "easy"
        ? "Easy"
        : timedBucketModal === "normal"
          ? "Normal"
          : timedBucketModal === "hard"
            ? "Hard"
            : "";

    return (
      <>
      <View
        style={{
          flex: 1,
          padding: 24,
          backgroundColor: colors.background,
          justifyContent: "center"
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8, textAlign: "center" }}>
          Session complete
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: colors.textSecondary,
            marginBottom: 8,
            textAlign: "center"
          }}
        >
          {total} card{total === 1 ? "" : "s"} reviewed
        </Text>
        {useTimedSummary && timedSessionSummary ? (
          <>
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                marginBottom: 6,
                textAlign: "center"
              }}
            >
              {formatAvgResponseMs(timedSessionSummary.meanMs)}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: colors.text,
                marginBottom: 20,
                textAlign: "center",
                fontWeight: "600"
              }}
            >
              {ratingCounts.gotIt} correct · {ratingCounts.didntGetIt} incorrect
            </Text>
          </>
        ) : (
          <View style={{ height: 12 }} />
        )}
        {useTimedSummary ? (
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              marginBottom: 12,
              textAlign: "center"
            }}
          >
            Wrong answers are always Hard. For correct answers, Normal = average ± a third; faster is Easy, slower is Hard. Tap a row to see cards.
          </Text>
        ) : null}
        <View style={{ gap: 16 }}>
          {rows.map(({ label, subtitle, count, percent, color, bucketKey }) => {
            const rowStyle = {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              justifyContent: "space-between" as const,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: color,
              backgroundColor: colors.listItemButtonBg
            };
            const inner = (
              <>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>{label}</Text>
                  {subtitle ? (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{subtitle}</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 17, fontWeight: "600", color: color }}>
                  {percent}%{" "}
                  <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textSecondary }}>
                    ({count})
                  </Text>
                </Text>
              </>
            );
            if (bucketKey != null && count > 0) {
              return (
                <TouchableOpacity
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={`${label}, ${count} cards. Tap for list.`}
                  onPress={() => setTimedBucketModal(bucketKey)}
                  activeOpacity={0.85}
                  style={rowStyle}
                >
                  {inner}
                </TouchableOpacity>
              );
            }
            return (
              <View key={label} style={rowStyle}>
                {inner}
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
          style={{
            marginTop: 32,
            paddingVertical: 14,
            borderRadius: 10,
            backgroundColor: FAB_COLOR,
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#ffffff" }}>Done</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={useTimedSummary && timedBucketModal != null && bucketModalItems.length > 0}
        transparent
        animationType="fade"
        onRequestClose={closeTimedBucketModal}
        supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
      >
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close list"
            onPress={closeTimedBucketModal}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={{
              marginHorizontal: 20,
              marginVertical: 40,
              maxHeight: "75%",
              alignSelf: "center",
              width: "100%",
              maxWidth: 400,
              borderRadius: 14,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: colors.border,
              backgroundColor: colors.inputSurface,
              ...(Platform.OS === "android"
                ? { elevation: 8 }
                : { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 })
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                paddingHorizontal: 18,
                paddingTop: 16,
                paddingBottom: 8
              }}
            >
              {bucketModalTitle} ({bucketModalItems.length})
            </Text>
            <ScrollView
              style={{ maxHeight: 360 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {bucketModalItems.map((item, i) => (
                <View
                  key={`${item.card.id}-${i}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: colors.border
                  }}
                >
                  <MaterialIcons
                    name={item.gotIt ? "check" : "close"}
                    size={24}
                    color={item.gotIt ? OUTLINE_GOT_IT : OUTLINE_DIDNT_GET}
                    style={{ marginTop: 2 }}
                    accessibilityLabel={item.gotIt ? "Correct" : "Incorrect"}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }} numberOfLines={4}>
                      {viewFaceText(item.card, studyReverseSides, "front")?.trim() || "(empty)"}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: colors.textSecondary, marginTop: 6 }}
                      numberOfLines={4}
                    >
                      {viewFaceText(item.card, studyReverseSides, "back")?.trim() || "(empty)"}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
                      {formatOneResponseMs(item.responseMs)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={closeTimedBucketModal}
              activeOpacity={0.85}
              style={{
                margin: 14,
                marginTop: 4,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: FAB_COLOR,
                alignItems: "center"
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#ffffff" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </>
    );
  }

  if (!currentCard) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          backgroundColor: colors.background
        }}
      >
        <Text style={{ color: colors.text }}>No cards in this deck yet.</Text>
      </View>
    );
  }

  const reviewHint = studyTypeItIn
    ? typeSubmitted
      ? "Check your answers below, then tap the card to continue"
      : "Type the answer and tap Submit · Tap the card to dismiss the keyboard"
    : ratingsVisible
      ? "Tap card to flip · Choose a rating below"
      : "Tap card to flip and show Got it / Didn't get it";

  const cardA11yLabel = studyTypeItIn
    ? typeSubmitted
      ? "Go to next card"
      : "Dismiss keyboard or review the prompt"
    : !ratingsVisible
      ? "Flip card and show difficulty options"
      : showBack
        ? "Show question"
        : "Show answer";

  const typeInAnswerFirst = currentEntry?.answerFirst ?? false;
  const cardShowsAnswerSide =
    studyTypeItIn && ratingsVisible
      ? typeSubmitted
        ? !typeInAnswerFirst
        : typeInAnswerFirst
      : showBack;
  const typeInAnswerComparison = studyTypeItIn && ratingsVisible && typeSubmitted;
  const typeInCorrectAnswerText =
    currentCard != null
      ? getTypeInExpectedRaw(currentCard, typeInAnswerFirst, studyReverseSides).trim() || "(empty)"
      : "(empty)";
  const studyDisplayFrontUri = viewFaceImageUri(currentCard, studyReverseSides, "front");
  const studyDisplayBackUri = viewFaceImageUri(currentCard, studyReverseSides, "back");
  const studyDisplayFrontText = viewFaceText(currentCard, studyReverseSides, "front");
  const studyDisplayBackText = viewFaceText(currentCard, studyReverseSides, "back");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? IOS_KEYBOARD_VERTICAL_HEADER + IOS_KEYBOARD_QUICKTYPE_BUFFER : 0
        }
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: isLandscape ? 22 : 12,
            paddingTop: isLandscape ? 10 : 8,
            paddingBottom:
              (isLandscape ? 10 : 8) + (typeInAnswerComparison ? 0 : insets.bottom),
            backgroundColor: colors.background
          }}
        >
      <Text
        style={{
          marginBottom: 8,
          marginLeft: isLandscape ? 2 : 4,
          color: colors.text,
          fontSize: 15
        }}
      >
        {currentIndex + 1}/{queue.length}
      </Text>

      <View
        style={{
          ...(inTypeInEntry && !isLandscape
            ? {
                flex: 1,
                flexGrow: 1,
                flexShrink: 1,
                maxHeight: typeInPortraitCardMaxPx,
                minHeight: 0
              }
            : {
                flex: isLandscape ? 0 : 1,
                flexGrow: isLandscape ? 0 : 1,
                flexShrink: !isLandscape ? 1 : 0,
                ...(isLandscape ? { height: landscapeCardPanelHeight } : {})
              }),
          marginBottom: ratingsVisible ? 12 : 8,
          minHeight: 0,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: colors.border,
          borderRadius: 12,
          backgroundColor: colors.inputSurface,
          overflow: "hidden"
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={isLandscape ? { flexGrow: 0, paddingVertical: 4 } : { flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            studyTypeItIn && ratingsVisible && !typeSubmitted
              ? Platform.OS === "ios"
                ? "interactive"
                : "on-drag"
              : "none"
          }
          showsVerticalScrollIndicator
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={cardA11yLabel}
            activeOpacity={0.92}
            onPress={onCardPress}
            style={{
              flexGrow: isLandscape ? 0 : 1,
              minHeight: cardTapMinHeight,
              justifyContent: "center",
              padding: isLandscape ? 12 : 16,
              alignItems: "center",
              paddingBottom: isLandscape ? 8 : 12
            }}
          >
            {cardShowsAnswerSide ? (
              <>
                {studyDisplayBackUri ? (
                  <Image
                    source={{ uri: studyDisplayBackUri }}
                    style={{ width: "100%", height: cardImageDisplayHeight, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>
                  {studyDisplayBackText}
                </Text>
              </>
            ) : (
              <>
                {studyDisplayFrontUri ? (
                  <Image
                    source={{ uri: studyDisplayFrontUri }}
                    style={{ width: "100%", height: cardImageDisplayHeight, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>
                  {studyDisplayFrontText}
                </Text>
              </>
            )}
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 14, textAlign: "center" }}>
              {reviewHint}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {ratingsVisible && studyTypeItIn ? (
        <View
          style={{
            marginTop: isLandscape ? 6 : 10,
            marginBottom: typeInAnswerComparison ? 0 : isLandscape ? 6 : 0,
            gap: 12
          }}
        >
          {!typeSubmitted ? (
            <>
              <TextInput
                ref={typeInputRef}
                accessibilityLabel="Your answer"
                value={typedAnswer}
                onChangeText={setTypedAnswer}
                placeholder="Type the answer…"
                placeholderTextColor={colors.placeholder}
                multiline
                editable
                style={{
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 17,
                  color: colors.text,
                  backgroundColor: colors.inputSurface,
                  minHeight: isLandscape ? 44 : 52,
                  textAlignVertical: "top"
                }}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Submit answer"
                onPress={onTypeSubmit}
                activeOpacity={0.85}
                style={{
                  paddingVertical: 14,
                  borderRadius: 10,
                  backgroundColor: FAB_COLOR,
                  alignItems: "center"
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: "600", color: "#ffffff" }}>Submit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: FAB_COLOR,
                  backgroundColor: colors.listItemButtonBg
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                  Correct answer
                </Text>
                <Text style={{ fontSize: 17, color: colors.text }}>{typeInCorrectAnswerText}</Text>
              </View>
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: FAB_COLOR,
                  backgroundColor: colors.listItemButtonBg
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 }}>
                  Your answer
                </Text>
                <Text style={{ fontSize: 17, color: colors.text }}>
                  {typedAnswer.trim() === "" ? "(empty)" : typedAnswer}
                </Text>
              </View>
            </>
          )}
        </View>
      ) : ratingsVisible ? (
        <View
          style={{
            flexDirection: "row",
            gap: 10,
            alignItems: isLandscape ? "stretch" : "flex-start",
            marginTop: isLandscape ? 4 : 0,
            marginBottom: isLandscape ? 6 : 0
          }}
        >
          {[
            {
              key: "didnt",
              label: "Didn't get it",
              rating: "hard" as const,
              outline: OUTLINE_DIDNT_GET
            },
            { key: "got", label: "Got it", rating: "easy" as const, outline: OUTLINE_GOT_IT }
          ].map(({ key, label, rating, outline }) => (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => void handleRating(rating)}
              activeOpacity={0.85}
              style={{
                ...ratingButtonStyle,
                backgroundColor: colors.listItemButtonBg,
                borderWidth: 2,
                borderColor: outline
              }}
            >
              <Text
                style={{
                  fontSize: isLandscape ? 15 : 16,
                  fontWeight: "600",
                  color: colors.text,
                  textAlign: "center"
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
        </View>
      </KeyboardAvoidingView>
      {typeInAnswerComparison ? (
        <View
          style={{
            height: insets.bottom + REVIEW_TYPEIN_COMPARISON_BOTTOM_BUFFER,
            backgroundColor: colors.background
          }}
        />
      ) : null}
    </View>
  );
};
