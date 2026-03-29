import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StorageProviderContext, createAsyncStorageProvider } from "./storageContext";
import { DeckListScreen } from "./screens/DeckListScreen";
import { DeckDetailScreen } from "./screens/DeckDetailScreen";
import { CardEditorScreen } from "./screens/CardEditorScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import type { RootStackParamList } from "./navigationTypes";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const storageProvider = React.useMemo(() => createAsyncStorageProvider(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StorageProviderContext.Provider value={storageProvider}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="DeckList" component={DeckListScreen} options={{ title: "Decks" }} />
            <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: "Deck" }} />
            <Stack.Screen name="CardEditor" component={CardEditorScreen} options={{ title: "Edit Card" }} />
            <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "Review" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </StorageProviderContext.Provider>
    </GestureHandlerRootView>
  );
}

