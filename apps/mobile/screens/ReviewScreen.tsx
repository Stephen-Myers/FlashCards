import React from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";
import { getNextReview, sortCardsByDueDate } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "Review">;
type ReviewRoute = RouteProp<RootStackParamList, "Review">;

const PRIMARY_BLUE = "#007AFF";
const OUTLINE_HARD = "#ff3b30";
const OUTLINE_GOOD = "#ffcc00";
const OUTLINE_EASY = "#34c759";
const CARD_IMAGE_HEIGHT = 200;

export const ReviewScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReviewRoute>();
  const { deckId } = route.params;

  const [queue, setQueue] = React.useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);
  const [ratingCounts, setRatingCounts] = React.useState({ hard: 0, good: 0, easy: 0 });
  const [sessionComplete, setSessionComplete] = React.useState(false);

  React.useEffect(() => {
    storage.cards.getCardsForDeck(deckId).then((cards) => {
      setQueue(sortCardsByDueDate(cards));
      setCurrentIndex(0);
      setShowBack(false);
      setRatingCounts({ hard: 0, good: 0, easy: 0 });
      setSessionComplete(false);
    });
  }, [storage, deckId]);

  const current = queue[currentIndex];

  const handleRating = async (rating: "hard" | "good" | "easy") => {
    if (!current) {
      navigation.goBack();
      return;
    }
    const update = getNextReview(current, { type: rating });
    await storage.cards.saveCard(update.updatedCard);
    setRatingCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      setSessionComplete(true);
      return;
    }
    setCurrentIndex(nextIndex);
    setShowBack(false);
  };

  if (sessionComplete && queue.length > 0) {
    const total = queue.length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    const rows = [
      { label: "Hard", count: ratingCounts.hard, percent: pct(ratingCounts.hard), color: OUTLINE_HARD },
      { label: "Good", count: ratingCounts.good, percent: pct(ratingCounts.good), color: OUTLINE_GOOD },
      { label: "Easy", count: ratingCounts.easy, percent: pct(ratingCounts.easy), color: OUTLINE_EASY }
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
            backgroundColor: PRIMARY_BLUE,
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "600", color: "#ffffff" }}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!current) {
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
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <Text style={{ marginBottom: 12, color: colors.text }}>
        {currentIndex + 1}/{queue.length}
      </Text>

      <View
        style={{
          flex: 1,
          marginBottom: 16,
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
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 16,
            alignItems: "center",
            paddingBottom: 12
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {showBack ? (
            <>
              {current.backImageUri && (
                <Image
                  source={{ uri: current.backImageUri }}
                  style={{ width: "100%", height: CARD_IMAGE_HEIGHT, marginBottom: 8 }}
                  resizeMode="contain"
                />
              )}
              <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{current.backText}</Text>
            </>
          ) : (
            <>
              {current.frontImageUri && (
                <Image
                  source={{ uri: current.frontImageUri }}
                  style={{ width: "100%", height: CARD_IMAGE_HEIGHT, marginBottom: 8 }}
                  resizeMode="contain"
                />
              )}
              <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{current.frontText}</Text>
            </>
          )}
          {showBack ? (
            <TouchableOpacity
              onPress={() => setShowBack(false)}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              style={{ marginTop: 12, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 14, color: PRIMARY_BLUE, fontWeight: "600" }}>Show question</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>

      <View>
        {!showBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show answer"
            onPress={() => setShowBack(true)}
            activeOpacity={0.85}
            style={{
              paddingVertical: 14,
              borderRadius: 10,
              backgroundColor: PRIMARY_BLUE,
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#ffffff" }}>Show answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            {[
              { key: "hard", label: "Hard", rating: "hard" as const, outline: OUTLINE_HARD },
              { key: "good", label: "Good", rating: "good" as const, outline: OUTLINE_GOOD },
              { key: "easy", label: "Easy", rating: "easy" as const, outline: OUTLINE_EASY }
            ].map(({ key, label, rating, outline }) => (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                onPress={() => void handleRating(rating)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 12,
                  backgroundColor: colors.listItemButtonBg,
                  borderWidth: 2,
                  borderColor: outline,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};
