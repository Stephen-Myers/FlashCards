import React from "react";
import { View, Text, TextInput, Button, ScrollView, Image } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useStorage } from "../storageContext";
import type { RootStackParamList } from "../App";
import type { Card } from "@flashcards/core";

type Nav = NativeStackNavigationProp<RootStackParamList, "CardEditor">;

export const CardEditorScreen: React.FC = () => {
  const storage = useStorage();
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const { deckId, cardId } = route.params as { deckId: string; cardId?: string };

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
  }, [cardId, storage.cards]);

  const pickImage = async (side: "front" | "back") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      if (side === "front") {
        setFrontImageUri(uri);
      } else {
        setBackImageUri(uri);
      }
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Front</Text>
      <TextInput
        value={frontText}
        onChangeText={setFrontText}
        placeholder="Front text"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 8,
          borderRadius: 4,
          minHeight: 80
        }}
      />
      <Button title={frontImageUri ? "Change front image" : "Add front image"} onPress={() => pickImage("front")} />
      {frontImageUri && (
        <Image
          source={{ uri: frontImageUri }}
          style={{ width: "100%", height: 180, marginTop: 8, borderRadius: 8 }}
          resizeMode="contain"
        />
      )}
      <Text>Back</Text>
      <TextInput
        value={backText}
        onChangeText={setBackText}
        placeholder="Back text"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 8,
          borderRadius: 4,
          minHeight: 80
        }}
      />
      <Button title={backImageUri ? "Change back image" : "Add back image"} onPress={() => pickImage("back")} />
      {backImageUri && (
        <Image
          source={{ uri: backImageUri }}
          style={{ width: "100%", height: 180, marginTop: 8, borderRadius: 8 }}
          resizeMode="contain"
        />
      )}
      <Button title="Save" onPress={onSave} />
    </ScrollView>
  );
};

