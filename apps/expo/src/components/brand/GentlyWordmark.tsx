import React from "react";
import { Text, View } from "react-native";

import { tokens } from "~/styles/tokens";
import { typographyV2 } from "~/styles/typographyV2";

import { GentlyMark } from "./GentlyMark";

interface Props {
  size?: number;
  markSize?: number;
  tone?: "light" | "dark";
}

export function GentlyWordmark({ size = 24, markSize = 26, tone = "dark" }: Props) {
  const color = tone === "light" ? "#F4F6F8" : tokens.color.inkH;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <GentlyMark size={markSize} />
      <Text
        style={[
          typographyV2.wordmark,
          { fontSize: size, color },
        ]}
      >
        gently
      </Text>
    </View>
  );
}
