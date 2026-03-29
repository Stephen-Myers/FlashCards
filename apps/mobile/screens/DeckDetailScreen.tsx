import React from "react";
import { View, Text, TextInput, Button, FlatList, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card, Deck } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckDetail">;
type DeckDetailRoute = RouteProp<RootStackParamList, "DeckDetail">;

export const DeckDetailScreen: React.FC = () => {
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DeckDetailRoute>();
  const { deckId } = route.params;

  const [deck, setDeck] = React.useState<Deck | undefined>();
  const [cards, setCards] = React.useState<Card[]>([]);
  const [deckName, setDeckName] = React.useState("");

  const load = React.useCallback(async () => {
    const d = await storage.decks.getDeck(deckId);
    const c = await storage.cards.getCardsForDeck(deckId);
    setDeck(d);
    setCards(c);
    if (d) setDeckName(d.name ?? "");
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

  const saveDeckName = async () => {
    const name = deckName.trim() || "Untitled deck";
    await storage.decks.saveDeck({ ...deck, name });
    setDeck({ ...deck, name });
    setDeckName(name);
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ marginBottom: 6, fontSize: 14, opacity: 0.7 }}>Deck name</Text>
      <TextInput
        value={deckName}
        onChangeText={setDeckName}
        onEndEditing={() => void saveDeckName()}
        placeholder="Deck name"
        style={{
          fontSize: 20,
          fontWeight: "600",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 8
        }}
      />
      <Button title="Save name" onPress={() => void saveDeckName()} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="Add Card" onPress={() => navigation.navigate("CardEditor", { deckId })} />
        <Button title="Study" onPress={() => navigation.navigate("Review", { deckId })} />
      </View>
      <FlatList<Card>
        data={cards}
        keyExtractor={(item: Card) => item.id}
        renderItem={({ item }: { item: Card }) => (
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

