import { Pressable, Text, View } from "react-native";

import { colors, typography } from "~/styles";

const LED_COLORS = [
  { id: "Red", swatch: "#E53935" },
  { id: "Yellow", swatch: "#FBC02D" },
  { id: "Green", swatch: "#43A047" },
  { id: "Blue", swatch: "#1E88E5" },
  { id: "Purple", swatch: "#8E24AA" },
  { id: "Orange", swatch: "#FB8C00" },
  { id: "White", swatch: "#F5F5F5" },
] as const;

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
}

export function LightColorPicker({ value, onChange }: Props) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={typography.label}>Light</Text>
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}
      >
        <Pressable
          onPress={() => onChange(null)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "transparent",
            borderWidth: value === null ? 3 : 1,
            borderColor:
              value === null ? colors.primary[500] : colors.border.medium,
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="No light"
          accessibilityState={{ selected: value === null }}
        >
          <Text style={[typography.buttonSmall, { color: colors.text.primary }]}>OFF</Text>
        </Pressable>
        {LED_COLORS.map(({ id, swatch }) => (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityLabel={`Color ${id}`}
            accessibilityState={{ selected: value === id }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: swatch,
              borderWidth: value === id ? 3 : 1,
              borderColor:
                value === id ? colors.primary[500] : colors.border.medium,
            }}
          />
        ))}
      </View>
    </View>
  );
}
