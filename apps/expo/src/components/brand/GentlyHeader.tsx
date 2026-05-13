import React from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { tokens } from "~/styles/tokens";

import { GentlyWordmark } from "./GentlyWordmark";

interface Props {
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function GentlyHeader({ showBack, onBack, right }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 22,
        paddingTop: 14,
        paddingBottom: 6,
      }}
    >
      {showBack ? (
        <Pressable
          onPress={onBack}
          style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
          hitSlop={8}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path
              d="M15 6l-6 6 6 6"
              stroke={tokens.color.inkH}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Pressable>
      ) : (
        <View style={{ width: 38 }} />
      )}

      <GentlyWordmark />

      {right ? (
        <View style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}>
          {right}
        </View>
      ) : (
        <View style={{ width: 38 }} />
      )}
    </View>
  );
}
