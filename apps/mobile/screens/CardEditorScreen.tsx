import React from "react";
import { View, Text, TextInput, Button, ScrollView, Image } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useStorage } from "../storageContext";
import { useAppTheme } from "../themeContext";
import type { RootStackParamList } from "../navigationTypes";
import type { Card } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "CardEditor">;
type CardEditorRoute = RouteProp<RootStackParamList, "CardEditor">;

function pickFirstAssetUri(result: ImagePicker.ImagePickerResult): string | undefined {
  if ("canceled" in result && result.canceled) {
    return undefined;
  }
  const legacy = result as ImagePicker.ImagePickerResult & { cancelled?: boolean; uri?: string };
  if (legacy.cancelled) {
    return undefined;
  }
  const fromAssets = legacy.assets?.[0]?.uri;
  if (fromAssets) {
    return fromAssets;
  }
  return legacy.uri;
}

export const CardEditorScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<CardEditorRoute>();
  const { deckId, cardId } = route.params;

  const [frontText, setFrontText] = React.useState("");
  const [backText, setBackText] = React.useState("");
  const [frontImageUri, setFrontImageUri] = React.useState<string | undefined>(undefined);
  const [backImageUri, setBackImageUri] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!cardId) return;
    storage.cards.getCard(cardId).then((card) => {
      if (card) {
        setFrontText(card.frontText);
        setBackText(card.backText);
        setFrontImageUri(card.frontImageUri);
        setBackImageUri(card.backImageUri);
      }
    });
  }, [cardId, storage]);

  const pickImage = async (side: "front" | "back") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    const uri = pickFirstAssetUri(result);
    if (!uri) return;
    if (side === "front") {
      setFrontImageUri(uri);
    } else {
      setBackImageUri(uri);
    }
  };

  const onSave = async () => {
    const existing = cardId ? await storage.cards.getCard(cardId) : undefined;
    const base: Card =
      existing ?? {
        id: cardId || "",
        deckId,
        frontText: "",
        backText: "",
        frontImageUri,
        backImageUri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

    await storage.cards.saveCard({
      ...base,
      deckId,
      frontText,
      backText,
      frontImageUri,
      backImageUri,
      updatedAt: new Date().toISOString()
    });
    navigation.goBack();
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputSurface,
    color: colors.text,
    padding: 8,
    borderRadius: 4,
    minHeight: 80,
    marginBottom: 12
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      <Text style={{ marginBottom: 8, color: colors.text }}>Front</Text>
      <TextInput
        value={frontText}
        onChangeText={setFrontText}
        placeholder="Front text"
        placeholderTextColor={colors.placeholder}
        multiline
        style={inputStyle}
      />
      <Button title={frontImageUri ? "Change front image" : "Add front image"} onPress={() => pickImage("front")} />
      {frontImageUri ? (
        <Image
          source={{ uri: frontImageUri }}
          style={{ width: "100%", height: 180, marginTop: 8, marginBottom: 16, borderRadius: 8 }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ height: 12 }} />
      )}
      <Text style={{ marginBottom: 8, color: colors.text }}>Back</Text>
      <TextInput
        value={backText}
        onChangeText={setBackText}
        placeholder="Back text"
        placeholderTextColor={colors.placeholder}
        multiline
        style={inputStyle}
      />
      <Button title={backImageUri ? "Change back image" : "Add back image"} onPress={() => pickImage("back")} />
      {backImageUri ? (
        <Image
          source={{ uri: backImageUri }}
          style={{ width: "100%", height: 180, marginTop: 8, marginBottom: 16, borderRadius: 8 }}
          resizeMode="contain"
        />
      ) : (
        <View style={{ height: 12 }} />
      )}
      <Button title="Save" onPress={onSave} />
    </ScrollView>
  );
};
