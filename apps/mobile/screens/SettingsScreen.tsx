import React from "react";
import {
  View,
  Text,
  Switch,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAppTheme, THEME_ACCENTS } from "../themeContext";
import { usePreferences } from "../preferencesContext";

const COLOR_SWATCH = 44;
const GRID_GAP = 12;
const GRID_COLUMNS = 3;

export const SettingsScreen: React.FC = () => {
  const { isDark, setDarkMode, colors, accentId, setAccentId } = useAppTheme();
  const { deckListDeleteMode, setDeckListDeleteMode } = usePreferences();
  const [themesOpen, setThemesOpen] = React.useState(false);
  const { width: windowWidth } = useWindowDimensions();
  const contentPad = 16;
  const gridWidth = windowWidth - contentPad * 2;
  const gridPad = Math.max(0, (gridWidth - GRID_COLUMNS * COLOR_SWATCH - (GRID_COLUMNS - 1) * GRID_GAP) / 2);

  return (
    <View style={{ flex: 1, padding: contentPad, backgroundColor: colors.background }}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={themesOpen ? "Collapse themes" : "Expand themes"}
        accessibilityState={{ expanded: themesOpen }}
        onPress={() => setThemesOpen((o) => !o)}
        activeOpacity={0.65}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        }}
      >
        <Text style={{ fontSize: 17, color: colors.text }}>Themes</Text>
        <MaterialIcons
          name={themesOpen ? "expand-more" : "chevron-right"}
          size={24}
          color={colors.textSecondary}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {themesOpen ? (
        <View style={{ paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 14,
              paddingBottom: 8,
              paddingHorizontal: 4
            }}
          >
            <Text style={{ fontSize: 17, color: colors.text }}>Dark mode</Text>
            <Switch
              accessibilityLabel="Toggle dark mode"
              value={isDark}
              onValueChange={setDarkMode}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={Platform.OS === "android" ? (isDark ? "#f2f2f7" : "#ffffff") : undefined}
              ios_backgroundColor={colors.border}
            />
          </View>

          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 10,
              marginTop: 4,
              paddingHorizontal: 4
            }}
          >
            Accent color
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: GRID_GAP,
              paddingHorizontal: gridPad > 0 ? gridPad : 4
            }}
          >
            {THEME_ACCENTS.map(({ id, color }) => {
              const selected = accentId === id;
              return (
                <TouchableOpacity
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`Accent color ${id}`}
                  accessibilityState={{ selected }}
                  onPress={() => setAccentId(id)}
                  activeOpacity={0.85}
                  style={{
                    width: COLOR_SWATCH,
                    height: COLOR_SWATCH,
                    borderRadius: COLOR_SWATCH / 2,
                    backgroundColor: color,
                    borderWidth: selected ? 3 : 0,
                    borderColor: colors.text,
                    ...(selected
                      ? Platform.OS === "android"
                        ? { elevation: 2 }
                        : {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2
                          }
                      : {})
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

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
