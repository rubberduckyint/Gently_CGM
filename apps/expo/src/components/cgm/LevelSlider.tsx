import { Text, View } from "react-native";
import Slider from "@react-native-community/slider";

import { colors, typography } from "~/styles";

const LABELS = ["Off", "Light", "Medium", "Strong", "Max"] as const;

interface Props {
  label: string;
  value: number;
  onChange: (next: number) => void;
}

export function LevelSlider({ label, value, onChange }: Props) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 4);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={typography.label}>{label}</Text>
        <Text style={{ color: colors.text.tertiary }}>{LABELS[clamped]}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={4}
        step={1}
        value={clamped}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={colors.primary[500]}
        maximumTrackTintColor={colors.border.medium}
      />
    </View>
  );
}
