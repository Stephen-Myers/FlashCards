import React from "react";
import { View, Text, Button, FlatList, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import type { RootStackParamList } from "../App";
import type { Card, Deck } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckDetail">;

export const DeckDetailScreen: React.FC = () => {
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const deckId: string = route.params.deckId;

  const [deck, setDeck] = React.useState<Deck | undefined>();
  const [cards, setCards] = React.useState<Card[]>([]);

  const load = React.useCallback(async () => {
    const d = await storage.decks.getDeck(deckId);
    const c = await storage.cards.getCardsForDeck(deckId);
    setDeck(d);
    setCards(c);
  }, [storage, deckId]);

  React.useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation, load]);

  if (!deck) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Deck not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>{deck.name || "Untitled deck"}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Add Card" onPress={() => navigation.navigate("CardEditor", { deckId })} />
        <Button title="Study" onPress={() => navigation.navigate("Review", { deckId })} />
      </View>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("CardEditor", { deckId, cardId: item.id })}
            style={{ paddingVertical: 8 }}
          >
            <Text numberOfLines={1} style={{ fontSize: 16 }}>
              {item.frontText || "(no front text)"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No cards yet. Add one to start studying.</Text>}
      />
    </View>
  );
};

