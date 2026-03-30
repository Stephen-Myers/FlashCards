import React from "react";
import { View, Text, FlatList, TouchableOpacity, Platform, Alert } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card, Deck } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckDetail">;
type DeckDetailRoute = RouteProp<RootStackParamList, "DeckDetail">;

const FAB_BLUE = "#007AFF";
const FAB_SIZE = 68;

function BookIcon() {
  return (
    <Text style={{ fontSize: 30, lineHeight: 32 }} importantForAccessibility="no">
      📖
    </Text>
  );
}

export const DeckDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DeckDetailRoute>();
  const insets = useSafeAreaInsets();
  const { deckId } = route.params;

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

  React.useLayoutEffect(() => {
    if (deck) {
      const title = deck.name?.trim() ? deck.name.trim() : "Untitled deck";
      navigation.setOptions({ title });
    } else {
      navigation.setOptions({ title: "Deck" });
    }
  }, [navigation, deck]);

  if (!deck) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.text }}>Deck not found.</Text>
      </View>
    );
  }

  const openCardEditor = (cardId: string) => {
    navigation.navigate("CardEditor", { deckId, cardId });
  };

  const confirmDeleteCard = (card: Card) => {
    Alert.alert("Delete card", "Remove this card from the deck?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await storage.cards.deleteCard(card.id);
            await load();
          })();
        }
      }
    ]);
  };

  /** Book (study) FAB — distance above home indicator */
  const fabBottom = 20 + insets.bottom;
  const fabRight = 16 + insets.right;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add card"
        onPress={() => navigation.navigate("CardEditor", { deckId })}
        activeOpacity={0.85}
        style={{
          marginHorizontal: 16,
          marginTop: 16,
          marginBottom: 12,
          borderRadius: 12,
          backgroundColor: FAB_BLUE,
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
          ...(Platform.OS === "android"
            ? { elevation: 3 }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.12,
                shadowRadius: 4
              })
        }}
      >
        <Text
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontWeight: "300",
            lineHeight: 30
          }}
        >
          +
        </Text>
      </TouchableOpacity>
      <FlatList<Card>
        data={cards}
        keyExtractor={(item: Card) => item.id}
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: fabBottom + FAB_SIZE + 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }: { item: Card }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.listItemButtonBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingVertical: 10,
              paddingLeft: 12,
              paddingRight: 8,
              gap: 8
            }}
          >
            <TouchableOpacity
              style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
              onPress={() => openCardEditor(item.id)}
              activeOpacity={0.7}
            >
              <Text numberOfLines={2} style={{ fontSize: 16, color: colors.text }}>
                {item.frontText || "(no front text)"}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit card"
                onPress={() => openCardEditor(item.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: FAB_BLUE,
                  backgroundColor: colors.background,
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Ionicons name="pencil" size={22} color={FAB_BLUE} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Delete card"
                onPress={() => confirmDeleteCard(item)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary }}>
            No cards yet. Use the blue + above to add one, or 📖 to study when cards are due.
          </Text>
        }
      />
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: fabRight,
          bottom: fabBottom,
          zIndex: 10,
          ...(Platform.OS === "android" ? { elevation: 12 } : {})
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Study deck"
          accessibilityHint="Open flashcard review for cards that are due"
          onPress={() => navigation.navigate("Review", { deckId })}
          activeOpacity={0.85}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: FAB_BLUE,
            alignItems: "center",
            justifyContent: "center",
            ...(Platform.OS === "ios"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.27,
                  shadowRadius: 4.65
                }
              : {})
          }}
        >
          <BookIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
};

