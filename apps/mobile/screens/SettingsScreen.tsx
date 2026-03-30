import React from "react";
import { View, Text, Switch, Platform, StyleSheet } from "react-native";
import { useAppTheme } from "../themeContext";
import { usePreferences } from "../preferencesContext";

export const SettingsScreen: React.FC = () => {
  const { isDark, setDarkMode, colors } = useAppTheme();
  const { deckListDeleteMode, setDeckListDeleteMode } = usePreferences();

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        }}
      >
        <Text style={{ fontSize: 17, color: colors.text }}>Dark mode</Text>
        <Switch
          accessibilityLabel="Toggle dark mode"
          value={isDark}
          onValueChange={setDarkMode}
          trackColor={{ false: colors.border, true: "#34c759" }}
          thumbColor={Platform.OS === "android" ? (isDark ? "#f2f2f7" : "#ffffff") : undefined}
          ios_backgroundColor={colors.border}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 17, color: colors.text }}>Delete mode</Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
            Deck list shows a trash icon instead of rename; tap to delete a deck.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Toggle delete mode on deck list"
          value={deckListDeleteMode}
          onValueChange={setDeckListDeleteMode}
          trackColor={{ false: colors.border, true: "#ff3b30" }}
          thumbColor={Platform.OS === "android" ? (deckListDeleteMode ? "#f2f2f7" : "#ffffff") : undefined}
          ios_backgroundColor={colors.border}
        />
      </View>
    </View>
  );
};
