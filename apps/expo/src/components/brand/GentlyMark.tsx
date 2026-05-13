import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

import { tokens } from "~/styles/tokens";

interface Props {
  size?: number;
  tintColor?: string;
}

export function GentlyMark({ size = 32, tintColor }: Props) {
  const dot = tintColor ?? tokens.color.cyan;
  const arc = tintColor ?? tokens.color.inkH;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="13" cy="20" r="5.4" fill={dot} />
      <Path
        d="M22 13.5 C26 16, 26 24, 22 26.5"
        stroke={arc}
        strokeOpacity={0.85}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M28 10 C34 14, 34 26, 28 30"
        stroke={arc}
        strokeOpacity={0.6}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
