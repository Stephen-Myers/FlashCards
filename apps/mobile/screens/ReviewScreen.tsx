import React from "react";
import { View, Text, Button, Image, TouchableOpacity } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";
import { isCardDue, getNextReview } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "Review">;
type ReviewRoute = RouteProp<RootStackParamList, "Review">;

export const ReviewScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReviewRoute>();
  const { deckId } = route.params;

  const [queue, setQueue] = React.useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showBack, setShowBack] = React.useState(false);

  React.useEffect(() => {
    storage.cards.getCardsForDeck(deckId).then((cards) => {
      const due = cards.filter((c) => isCardDue(c));
      setQueue(due);
      setCurrentIndex(0);
      setShowBack(false);
    });
  }, [storage, deckId]);

  const current = queue[currentIndex];

  const handleRating = async (rating: "again" | "hard" | "good" | "easy") => {
    if (!current) {
      navigation.goBack();
      return;
    }
    const update = getNextReview(current, { type: rating });
    await storage.cards.saveCard(update.updatedCard);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      navigation.goBack();
      return;
    }
    setCurrentIndex(nextIndex);
    setShowBack(false);
  };

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
        <Text style={{ color: colors.text }}>No cards due right now.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <Text style={{ marginBottom: 16, color: colors.text }}>
        {currentIndex + 1}/{queue.length}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowBack((prev) => !prev)}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 16,
          backgroundColor: colors.inputSurface
        }}
      >
        {showBack ? (
          <>
            {current.backImageUri && (
              <Image
                source={{ uri: current.backImageUri }}
                style={{ width: "100%", height: 200, marginBottom: 8 }}
                resizeMode="contain"
              />
            )}
            <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{current.backText}</Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Tap to see question</Text>
          </>
        ) : (
          <>
            {current.frontImageUri && (
              <Image
                source={{ uri: current.frontImageUri }}
                style={{ width: "100%", height: 200, marginBottom: 8 }}
                resizeMode="contain"
              />
            )}
            <Text style={{ fontSize: 20, textAlign: "center", color: colors.text }}>{current.frontText}</Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>Tap to show answer</Text>
          </>
        )}
      </TouchableOpacity>
      {!showBack ? (
        <View style={{ marginTop: 16 }}>
          <Button title="Show Answer" onPress={() => setShowBack(true)} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 4 }}>
          <Button title="Again" onPress={() => handleRating("again")} />
          <Button title="Hard" onPress={() => handleRating("hard")} />
          <Button title="Good" onPress={() => handleRating("good")} />
          <Button title="Easy" onPress={() => handleRating("easy")} />
        </View>
      )}
    </View>
  );
};
