import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StorageProviderContext, createAsyncStorageProvider } from "./storageContext";
import { ThemeProvider, useAppTheme } from "./themeContext";
import { PreferencesProvider } from "./preferencesContext";
import { DeckListScreen } from "./screens/DeckListScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { DeckDetailScreen } from "./screens/DeckDetailScreen";
import { CardEditorScreen } from "./screens/CardEditorScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import type { RootStackParamList } from "./navigationTypes";

const Stack = createNativeStackNavigator<RootStackParamList>();

function NavigationRoot() {
  const { isDark, colors } = useAppTheme();

  const navigationTheme = React.useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.accent,
        background: colors.background,
        card: colors.headerBg,
        text: colors.text,
        border: colors.border,
        notification: isDark ? "#ff453a" : DefaultTheme.colors.notification
      }
    }),
    [isDark, colors]
  );

  const stackScreenOptions = React.useMemo(
    () => ({
      headerStyle: {
        backgroundColor: colors.headerBg,
        ...(Platform.OS === "android" ? { elevation: 0 } : {})
      },
      headerTintColor: colors.headerTint,
      headerTitleStyle: { color: colors.headerTint },
      headerShadowVisible: false,
      headerLeftContainerStyle: { backgroundColor: "transparent" as const },
      headerRightContainerStyle: { backgroundColor: "transparent" as const },
      contentStyle: { backgroundColor: colors.background }
    }),
    [colors]
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen
          name="DeckList"
          component={DeckListScreen}
          options={({ navigation }) => ({
            title: "Decks",
            headerLeft: () => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open settings"
                onPress={() => navigation.navigate("Settings")}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={{ marginLeft: 4, paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ fontSize: 17, color: colors.headerTint }}>Settings</Text>
              </TouchableOpacity>
            )
          })}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
        <Stack.Screen name="DeckDetail" component={DeckDetailScreen} options={{ title: "" }} />
        <Stack.Screen name="CardEditor" component={CardEditorScreen} options={{ title: "Edit Card" }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ title: "Review" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppShell() {
  const { colors } = useAppTheme();
  const [iconsLoaded] = useFonts(MaterialIcons.font);
  const storageProvider = React.useMemo(() => createAsyncStorageProvider(), []);

  if (!iconsLoaded) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StorageProviderContext.Provider value={storageProvider}>
          <NavigationRoot />
        </StorageProviderContext.Provider>
      </View>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <PreferencesProvider>
          <AppShell />
        </PreferencesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
