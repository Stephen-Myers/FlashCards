import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  Pressable,
  Switch,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  ScrollView
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import { usePreferences } from "../preferencesContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card, Deck } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "DeckDetail">;
type DeckDetailRoute = RouteProp<RootStackParamList, "DeckDetail">;

const FAB_SIZE = 68;

/** Let deck dropdown modals rotate with the device (iOS defaults can lock modals to portrait). */
const MODAL_SUPPORTED_ORIENTATIONS: Array<
  "portrait" | "landscape" | "landscape-left" | "landscape-right" | "portrait-upside-down"
> = ["portrait", "landscape-left", "landscape-right"];

function BookIcon() {
  return (
    <Text style={{ fontSize: 30, lineHeight: 32 }} importantForAccessibility="no">
      📖
    </Text>
  );
}

export const DeckDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const FAB_COLOR = colors.accent;
  const {
    studyFullMix,
    setStudyFullMix,
    deckDetailCondensedCards,
    setDeckDetailCondensedCards,
    studySessionMaxCards,
    setStudySessionMaxCards
  } = usePreferences();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<DeckDetailRoute>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { deckId, deckName: deckNameParam } = route.params;

  const [deck, setDeck] = React.useState<Deck | undefined>();
  const [cards, setCards] = React.useState<Card[]>([]);
  const [deckMenuOpen, setDeckMenuOpen] = React.useState(false);
  const [combineMenuOpen, setCombineMenuOpen] = React.useState(false);
  const [combineGroupSize, setCombineGroupSize] = React.useState(1);
  const [combineSeparator, setCombineSeparator] = React.useState("");

  const load = React.useCallback(async () => {
    const d = await storage.decks.getDeck(deckId);
    const c = await storage.cards.getCardsForDeck(deckId);
    setDeck(d);
    setCards(c);
  }, [storage, deckId]);

  React.useEffect(() => {
    setDeck(undefined);
    setCards([]);
  }, [deckId]);

  React.useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    load();
    return unsub;
  }, [navigation, load]);

  const headerTitle =
    deck != null
      ? deck.name?.trim()
        ? deck.name.trim()
        : "Untitled deck"
      : deckNameParam != null
        ? deckNameParam.trim()
          ? deckNameParam.trim()
          : "Untitled deck"
        : "Deck";

  React.useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [navigation, headerTitle]);

  const closeDeckMenu = React.useCallback(() => setDeckMenuOpen(false), []);
  const closeCombineMenu = React.useCallback(() => setCombineMenuOpen(false), []);

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
  const listHorizontalPadding = 32;
  const condensedColumnGap = 8;
  const condensedCellWidth = (windowWidth - listHorizontalPadding - condensedColumnGap) / 2;
  /** Space under header strip + safe areas; scroll when tall panels would overflow in landscape. */
  const deckDropdownMaxHeight = Math.max(220, windowHeight - insets.top - 56 - insets.bottom - 12);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 12,
          marginBottom: 4,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Combine cards for study"
          onPress={() => setCombineMenuOpen(true)}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: colors.border,
            backgroundColor: colors.listItemButtonBg
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Combine</Text>
          <Ionicons name="chevron-down" size={18} color={colors.text} />
          {combineGroupSize > 1 ? (
            <View
              style={{
                marginLeft: 2,
                minWidth: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: FAB_COLOR,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#ffffff" }}>{combineGroupSize}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open deck options"
          onPress={() => setDeckMenuOpen(true)}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderColor: colors.border,
            backgroundColor: colors.listItemButtonBg
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>Options</Text>
          <Ionicons name="chevron-down" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={combineMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCombineMenu}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss combine settings"
            onPress={closeCombineMenu}
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
          <View
            style={{
              position: "absolute",
              top: insets.top + 52,
              left: 16 + insets.left,
              right: 16 + insets.right,
              maxWidth: 400,
              maxHeight: deckDropdownMaxHeight,
              alignSelf: "center",
              width: "100%",
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: colors.border,
              backgroundColor: colors.inputSurface,
              ...(Platform.OS === "android" ? { elevation: 8 } : { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 })
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            >
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 6 }}>Combine</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 14 }}>
              Group this many cards into one longer card for the next study session only. Nothing new is saved to
              the deck; your ratings still update each original card.
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>Cards per combo</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setCombineGroupSize(n)}
                  accessibilityRole="button"
                  accessibilityLabel={n === 1 ? "One card per slide" : `Combine ${n} cards`}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: combineGroupSize === n ? FAB_COLOR : colors.border,
                    backgroundColor: combineGroupSize === n ? FAB_COLOR : colors.listItemButtonBg
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: combineGroupSize === n ? "#ffffff" : colors.text
                    }}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
              Separator between texts
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
              Optional. Leave empty for no gap. For a space between elements, type one ordinary space in the field—the
              same character written as {'" "'} (an opening quote, one space, a closing quote).
            </Text>
            <TextInput
              value={combineSeparator}
              onChangeText={setCombineSeparator}
              placeholder='You can also use punctuation, e.g. " · " between cards'
              placeholderTextColor={colors.placeholder}
              multiline
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 10,
                color: colors.text,
                backgroundColor: colors.background,
                minHeight: 48,
                marginBottom: 16,
                textAlignVertical: 'top'
              }}
            />
            <TouchableOpacity
              accessibilityRole='button'
              accessibilityLabel='Done'
              onPress={closeCombineMenu}
              activeOpacity={0.85}
              style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: FAB_COLOR, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>Done</Text>
            </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={deckMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeckMenu}
        supportedOrientations={MODAL_SUPPORTED_ORIENTATIONS}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss menu"
            onPress={closeDeckMenu}
            style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" }}
          />
          <View
            style={{
              position: "absolute",
              top: insets.top + 52,
              right: 16 + insets.right,
              width: Math.min(320, windowWidth - 32),
              maxHeight: deckDropdownMaxHeight,
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: colors.border,
              backgroundColor: colors.inputSurface,
              ...(Platform.OS === "android" ? { elevation: 8 } : { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 })
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              nestedScrollEnabled
              contentContainerStyle={{ paddingVertical: 8 }}
            >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                gap: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border
              }}
            >
              <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" }}>Full mix</Text>
              <Switch
                accessibilityLabel="Toggle full mix for study"
                value={studyFullMix}
                onValueChange={(v) => {
                  setStudyFullMix(v);
                }}
                trackColor={{ false: colors.border, true: "#34c759" }}
                thumbColor={Platform.OS === "android" ? (studyFullMix ? "#f2f2f7" : "#ffffff") : undefined}
                ios_backgroundColor={colors.border}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                gap: 12
              }}
            >
              <Text style={{ flex: 1, fontSize: 16, color: colors.text, fontWeight: "500" }}>Condensed cards</Text>
              <Switch
                accessibilityLabel="Toggle condensed card grid on deck detail"
                value={deckDetailCondensedCards}
                onValueChange={setDeckDetailCondensedCards}
                trackColor={{ false: colors.border, true: "#34c759" }}
                thumbColor={
                  Platform.OS === "android" ? (deckDetailCondensedCards ? "#f2f2f7" : "#ffffff") : undefined
                }
                ios_backgroundColor={colors.border}
              />
            </View>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border
              }}
            >
              <Text style={{ fontSize: 16, color: colors.text, fontWeight: "500", marginBottom: 6 }}>Length</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                Max cards in the next study session (each slide counts as one). Leave empty for the full deck.
              </Text>
              <TextInput
                accessibilityLabel="Study session max card count"
                value={studySessionMaxCards == null ? "" : String(studySessionMaxCards)}
                onChangeText={(raw) => {
                  const digitsOnly = raw.replace(/\D/g, "").slice(0, 5);
                  if (digitsOnly === "") {
                    setStudySessionMaxCards(null);
                    return;
                  }
                  const n = parseInt(digitsOnly, 10);
                  if (Number.isNaN(n) || n <= 0) {
                    setStudySessionMaxCards(null);
                    return;
                  }
                  setStudySessionMaxCards(n);
                }}
                placeholder="All cards"
                placeholderTextColor={colors.placeholder}
                keyboardType="number-pad"
                inputMode="numeric"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.background
                }}
              />
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add card"
        onPress={() => navigation.navigate("CardEditor", { deckId })}
        activeOpacity={0.85}
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 12,
          borderRadius: 12,
          backgroundColor: FAB_COLOR,
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
        extraData={deckDetailCondensedCards}
        key={deckDetailCondensedCards ? "condensed" : "full"}
        numColumns={deckDetailCondensedCards ? 2 : 1}
        keyExtractor={(item: Card) => item.id}
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: fabBottom + FAB_SIZE + 16 }}
        ItemSeparatorComponent={deckDetailCondensedCards ? undefined : () => <View style={{ height: 10 }} />}
        columnWrapperStyle={
          deckDetailCondensedCards
            ? { marginBottom: 8, gap: condensedColumnGap, justifyContent: "flex-start" }
            : undefined
        }
        renderItem={({ item }: { item: Card }) =>
          deckDetailCondensedCards ? (
            <View style={{ width: condensedCellWidth }}>
              <View
                style={{
                  backgroundColor: colors.listItemButtonBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  gap: 6
                }}
              >
                <TouchableOpacity onPress={() => openCardEditor(item.id)} activeOpacity={0.7}>
                  <Text numberOfLines={3} style={{ fontSize: 14, color: colors.text, lineHeight: 18 }}>
                    {item.frontText || "(no text)"}
                  </Text>
                </TouchableOpacity>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Edit card"
                    onPress={() => openCardEditor(item.id)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: FAB_COLOR,
                      backgroundColor: colors.background,
                      minWidth: 36,
                      minHeight: 36,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Ionicons name="pencil" size={18} color={FAB_COLOR} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Delete card"
                    onPress={() => confirmDeleteCard(item)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                      minWidth: 36,
                      minHeight: 36,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff3b30" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
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
                    borderColor: FAB_COLOR,
                    backgroundColor: colors.background,
                    minWidth: 44,
                    minHeight: 44,
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Ionicons name="pencil" size={22} color={FAB_COLOR} />
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
          )
        }
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
          onPress={() =>
            navigation.navigate("Review", {
              deckId,
              combineGroupSize,
              combineSeparator
            })
          }
          activeOpacity={0.85}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: FAB_COLOR,
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

