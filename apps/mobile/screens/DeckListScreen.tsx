import React from "react";
import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import type { Deck } from "@flashcards/core";
import type { RootStackParamList } from "../navigationTypes";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckList">;

const FAB_BLUE = "#007AFF";

export const DeckListScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
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

  const fabBottom = 24 + insets.bottom;
  const listGutter = 24;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList<Deck>
        data={decks}
        keyExtractor={(item: Deck) => item.id}
        contentContainerStyle={{
          paddingLeft: listGutter + insets.left,
          paddingRight: listGutter + insets.right,
          paddingTop: 16,
          paddingBottom: fabBottom + 72
        }}
        style={{ backgroundColor: colors.background }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }: { item: Deck }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Open deck ${item.name || "Untitled deck"}`}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("DeckDetail", { deckId: item.id })}
            style={{
              backgroundColor: colors.listItemButtonBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 16,
              ...(Platform.OS === "android"
                ? { elevation: 2 }
                : {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.08,
                    shadowRadius: 3
                  })
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }} numberOfLines={2}>
              {item.name || "Untitled deck"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary }}>No decks yet. Tap + below to create a deck.</Text>
        }
      />
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: fabBottom,
          alignItems: "center"
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="New deck"
          onPress={() => void handleNewDeck()}
          activeOpacity={0.85}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: FAB_BLUE,
            alignItems: "center",
            justifyContent: "center",
            ...(Platform.OS === "android"
              ? { elevation: 6 }
              : {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.27,
                  shadowRadius: 4.65
                })
          }}
        >
          <Text
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: "300",
              lineHeight: 34,
              marginTop: Platform.OS === "ios" ? -1 : 0
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
