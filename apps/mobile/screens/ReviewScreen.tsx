import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import { usePreferences } from "../preferencesContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";
import { getNextReview, shuffleStudyQueue, shuffleStudyQueueFully } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "Review">;
type ReviewRoute = RouteProp<RootStackParamList, "Review">;

const OUTLINE_DIDNT_GET = "#ff3b30";
const OUTLINE_GOT_IT = "#34c759";
const CARD_IMAGE_HEIGHT = 200;

type QueuedCard = {
  card: Card;
  /** When true, this card opens on the back (answer) first — only used when Full mix is on. */
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

export const ReviewScreen: React.FC = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const { colors } = useAppTheme();
  const FAB_COLOR = colors.accent;
  const { studyFullMix, studySessionMaxCards } = usePreferences();
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
  const [sessionComplete, setSessionComplete] = React.useState(false);

  React.useEffect(() => {
    storage.cards.getCardsForDeck(deckId).then((cards) => {
      let built = buildStudyQueue(cards, studyFullMix, combineGroupSize, combineSeparator);
      if (studySessionMaxCards != null && studySessionMaxCards > 0) {
        built = built.slice(0, studySessionMaxCards);
      }
      setQueue(built);
      setCurrentIndex(0);
      setShowBack(built[0]?.answerFirst ?? false);
      setRatingsVisible(false);
      setRatingCounts({ gotIt: 0, didntGetIt: 0 });
      setSessionComplete(false);
    });
  }, [storage, deckId, studyFullMix, studySessionMaxCards, combineGroupSize, combineSeparator]);

  const currentEntry = queue[currentIndex];
  const currentCard = currentEntry?.card;

  const handleRating = async (rating: "hard" | "easy") => {
    if (!currentEntry || !currentCard) {
      navigation.goBack();
      return;
    }
    for (const id of currentEntry.sourceCardIds) {
      const c = await storage.cards.getCard(id);
      if (!c) continue;
      const update = getNextReview(c, { type: rating });
      await storage.cards.saveCard(update.updatedCard);
    }
    setRatingCounts((prev) =>
      rating === "easy"
        ? { ...prev, gotIt: prev.gotIt + 1 }
        : { ...prev, didntGetIt: prev.didntGetIt + 1 }
    );
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setSessionComplete(true);
      return;
    }
    setCurrentIndex(nextIndex);
    setShowBack(queue[nextIndex]?.answerFirst ?? false);
    setRatingsVisible(false);
  };

  const onCardPress = React.useCallback(() => {
    setShowBack((prev) => !prev);
    setRatingsVisible(true);
  }, []);

  const cardTapMinHeight = isLandscape
    ? Math.max(88, Math.round(windowHeight * (ratingsVisible ? 0.28 : 0.42)))
    : Math.max(300, Math.round(windowHeight * (ratingsVisible ? 0.4 : 0.62)));

  const cardImageDisplayHeight = isLandscape
    ? Math.min(CARD_IMAGE_HEIGHT, Math.max(72, Math.round(windowHeight * 0.24)))
    : CARD_IMAGE_HEIGHT;

  /** Bounded card panel height in landscape (short screen axis). */
  const landscapeCardPanelHeight = Math.round(windowHeight * 0.46);

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
    const rows = [
      {
        label: "Got it",
        count: ratingCounts.gotIt,
        percent: pct(ratingCounts.gotIt),
        color: OUTLINE_GOT_IT
      },
      {
        label: "Didn't get it",
        count: ratingCounts.didntGetIt,
        percent: pct(ratingCounts.didntGetIt),
        color: OUTLINE_DIDNT_GET
      }
    ];
    return (
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
            marginBottom: 28,
            textAlign: "center"
          }}
        >
          {total} card{total === 1 ? "" : "s"} reviewed
        </Text>
        <View style={{ gap: 16 }}>
          {rows.map(({ label, count, percent, color }) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: color,
                backgroundColor: colors.listItemButtonBg
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>{label}</Text>
              <Text style={{ fontSize: 17, fontWeight: "600", color: color }}>
                {percent}%{" "}
                <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textSecondary }}>
                  ({count})
                </Text>
              </Text>
            </View>
          ))}
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

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: isLandscape ? 22 : 12,
        paddingTop: isLandscape ? 10 : 8,
        paddingBottom: isLandscape ? 10 : 0,
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
          flex: isLandscape ? 0 : 1,
          flexGrow: isLandscape ? 0 : 1,
          marginBottom: ratingsVisible ? 12 : 8,
          minHeight: 0,
          ...(isLandscape ? { height: landscapeCardPanelHeight } : {}),
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
          showsVerticalScrollIndicator
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              !ratingsVisible
                ? "Flip card and show difficulty options"
                : showBack
                  ? "Show question"
                  : "Show answer"
            }
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
            {showBack ? (
              <>
                {currentCard.backImageUri && (
                  <Image
                    source={{ uri: currentCard.backImageUri }}
                    style={{ width: "100%", height: cardImageDisplayHeight, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                )}
                <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{currentCard.backText}</Text>
              </>
            ) : (
              <>
                {currentCard.frontImageUri && (
                  <Image
                    source={{ uri: currentCard.frontImageUri }}
                    style={{ width: "100%", height: cardImageDisplayHeight, marginBottom: 8 }}
                    resizeMode="contain"
                  />
                )}
                <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{currentCard.frontText}</Text>
              </>
            )}
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 14, textAlign: "center" }}>
              {ratingsVisible
                ? "Tap card to flip · Choose a rating below"
                : "Tap card to flip and show Got it / Didn't get it"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {ratingsVisible ? (
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
  );
};
