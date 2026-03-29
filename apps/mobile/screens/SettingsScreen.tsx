import React from "react";
import { View, Text, Switch, Platform, StyleSheet } from "react-native";
import { useAppTheme } from "../themeContext";

export const SettingsScreen: React.FC = () => {
  const { isDark, setDarkMode, colors } = useAppTheme();

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
    </View>
  );
};
