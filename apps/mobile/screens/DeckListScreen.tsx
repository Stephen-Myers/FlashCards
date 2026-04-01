import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import { usePreferences } from "../preferencesContext";
import type { Deck } from "@flashcards/core";
import type { RootStackParamList } from "../navigationTypes";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckList">;

const DESTRUCTIVE_RED = "#ff3b30";
const FAB_SIZE = 68;

export const DeckListScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const FAB_COLOR = colors.accent;
  const { deckListDeleteMode } = usePreferences();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [decks, setDecks] = React.useState<Deck[]>([]);
  const [renameDeck, setRenameDeck] = React.useState<Deck | null>(null);
  const [renameText, setRenameText] = React.useState("");

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
    navigation.navigate("DeckDetail", { deckId: id, deckName: "New deck" });
  }, [storage, navigation]);

  const openRename = React.useCallback((deck: Deck) => {
    setRenameDeck(deck);
    setRenameText(deck.name ?? "");
  }, []);

  const closeRename = React.useCallback(() => {
    setRenameDeck(null);
    setRenameText("");
  }, []);

  const saveRename = React.useCallback(async () => {
    if (!renameDeck) return;
    const name = renameText.trim() || "Untitled deck";
    await storage.decks.saveDeck({ ...renameDeck, name });
    closeRename();
    loadDecks();
  }, [renameDeck, renameText, storage, closeRename, loadDecks]);

  const confirmDeleteDeck = React.useCallback(
    (deck: Deck) => {
      const label = deck.name?.trim() || "Untitled deck";
      Alert.alert(
        "Delete deck",
        `Remove “${label}” and all of its cards? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                await storage.decks.deleteDeck(deck.id);
                loadDecks();
              })();
            }
          }
        ]
      );
    },
    [storage, loadDecks]
  );

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
          paddingBottom: fabBottom + FAB_SIZE + 16
        }}
        style={{ backgroundColor: colors.background }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }: { item: Deck }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.listItemButtonBg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingVertical: 12,
              paddingLeft: 16,
              paddingRight: 8,
              gap: 8,
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
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Open deck ${item.name || "Untitled deck"}`}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate("DeckDetail", {
                  deckId: item.id,
                  deckName: item.name?.trim() ? item.name.trim() : "Untitled deck"
                })
              }
              style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }} numberOfLines={2}>
                {item.name || "Untitled deck"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                deckListDeleteMode
                  ? `Delete deck ${item.name || "Untitled deck"}`
                  : `Rename deck ${item.name || "Untitled deck"}`
              }
              onPress={() =>
                deckListDeleteMode ? confirmDeleteDeck(item) : openRename(item)
              }
              style={{
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: deckListDeleteMode ? DESTRUCTIVE_RED : FAB_COLOR,
                backgroundColor: colors.background,
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MaterialIcons
                name={deckListDeleteMode ? "delete" : "edit"}
                size={24}
                color={deckListDeleteMode ? DESTRUCTIVE_RED : FAB_COLOR}
              />
            </TouchableOpacity>
          </View>
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
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: FAB_COLOR,
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
              fontSize: 38,
              fontWeight: "300",
              lineHeight: 40,
              marginTop: Platform.OS === "ios" ? -2 : 0
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={renameDeck != null} transparent animationType="fade" onRequestClose={closeRename}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, justifyContent: "center", padding: 24 }}
        >
          <Pressable
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)"
            }}
            onPress={closeRename}
          />
          <View
            style={{
              zIndex: 1,
              backgroundColor: colors.inputSurface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 20
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 12 }}>
              Rename deck
            </Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Deck name"
              placeholderTextColor={colors.placeholder}
              autoFocus
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.background,
                marginBottom: 16
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity onPress={closeRename} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void saveRename()}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  backgroundColor: FAB_COLOR,
                  borderRadius: 8
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#ffffff" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};
