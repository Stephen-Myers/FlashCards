import React from "react";
import { View, Text, Button, Image } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";
import { isCardDue, getNextReview } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "Review">;
type ReviewRoute = RouteProp<RootStackParamList, "Review">;

export const ReviewScreen: React.FC = () => {
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text>No cards due right now.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ marginBottom: 16 }}>
        {currentIndex + 1}/{queue.length}
      </Text>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 16
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
            <Text style={{ fontSize: 20, textAlign: "center" }}>{current.backText}</Text>
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
            <Text style={{ fontSize: 20, textAlign: "center" }}>{current.frontText}</Text>
          </>
        )}
      </View>
      {!showBack ? (
        <View style={{ marginTop: 16 }}>
          <Button title="Show Answer" onPress={() => setShowBack(true)} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
          <Button title="Again" onPress={() => handleRating("again")} />
          <Button title="Hard" onPress={() => handleRating("hard")} />
          <Button title="Good" onPress={() => handleRating("good")} />
          <Button title="Easy" onPress={() => handleRating("easy")} />
        </View>
      )}
    </View>
  );
};

