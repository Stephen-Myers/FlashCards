import React from "react";
import { View, Text, Button, FlatList, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useStorage } from "../storageContext";
import type { Deck } from "@flashcards/core";
import type { RootStackParamList } from "../navigationTypes";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckList">;

export const DeckListScreen: React.FC = () => {
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const [decks, setDecks] = React.useState<Deck[]>([]);

  const loadDecks = React.useCallback(() => {
    storage.decks.getAllDecks().then(setDecks);
  }, [storage]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadDecks);
    loadDecks();
    return unsubscribe;
  }, [navigation, loadDecks]);

  const handleNewDeck = React.useCallback(async () => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    await storage.decks.saveDeck({
      id,
      name: "New deck",
      description: "",
      cardOrder: [],
      createdAt: now,
      updatedAt: now
    });
    navigation.navigate("DeckDetail", { deckId: id });
  }, [storage, navigation]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Button title="New Deck" onPress={() => void handleNewDeck()} />
      <FlatList<Deck>
        data={decks}
        keyExtractor={(item: Deck) => item.id}
        renderItem={({ item }: { item: Deck }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("DeckDetail", { deckId: item.id })}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 18 }}>{item.name || "Untitled deck"}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No decks yet. Create one to get started.</Text>}
      />
    </View>
  );
};

