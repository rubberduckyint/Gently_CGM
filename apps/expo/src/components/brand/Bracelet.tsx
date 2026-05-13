import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { tokens } from "~/styles/tokens";

export type BraceletState = "instruct" | "scanning" | "discovered" | "success";

interface Props {
  state: BraceletState;
  size?: number;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// Ripple ring component — three staggered rings for the scanning state
function RippleRing({ delay, totalSize }: { delay: number; totalSize: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    // Stagger start via an initial timed offset then loop
    const id = setTimeout(() => {
      scale.value = withRepeat(
        withTiming(1.7, { duration: 1800 }),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withTiming(0, { duration: 1800 }),
        -1,
        false,
      );
    }, delay * 1000);
    return () => clearTimeout(id);
  }, [delay, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ringSize = totalSize * 0.96; // ~230 when totalSize=240
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 2,
          borderColor: tokens.color.cyan,
        },
        animStyle,
      ]}
    />
  );
}

export function Bracelet({ state = "instruct", size = 240 }: Props) {
  const pulseColor = state === "success" ? tokens.color.cyanDeep : tokens.color.cyan;

  // LED bar opacity animation
  // instruct: slow blink 1.4s; scanning: faster 0.9s; discovered/success: steady on
  const ledOpacity = useSharedValue(1);
  const bloomOpacity = useSharedValue(state === "instruct" || state === "scanning" ? 0.22 : 0);

  useEffect(() => {
    if (state === "instruct") {
      // 1.4s slow pulse: opacity 1 → 0.35 → 1
      ledOpacity.value = withRepeat(withTiming(0.35, { duration: 700 }), -1, true);
      bloomOpacity.value = withRepeat(withTiming(0.08, { duration: 700 }), -1, true);
    } else if (state === "scanning") {
      // 0.9s faster pulse
      ledOpacity.value = withRepeat(withTiming(0.35, { duration: 450 }), -1, true);
      bloomOpacity.value = withRepeat(withTiming(0.08, { duration: 450 }), -1, true);
    } else {
      // discovered / success: steady on
      ledOpacity.value = withTiming(1, { duration: 200 });
      bloomOpacity.value = withTiming(state === "success" ? 0.18 : 0, { duration: 200 });
    }
  }, [state, ledOpacity, bloomOpacity]);

  const ledAnimProps = useAnimatedProps(() => ({ opacity: ledOpacity.value }));
  const bloomAnimProps = useAnimatedProps(() => ({ opacity: bloomOpacity.value }));

  // Scale SVG from native 300×180 to requested size
  const svgWidth = size * (300 / 180);
  const svgHeight = size;

  // 24 brushed lines on the aluminum plate
  const brushLines = Array.from({ length: 24 }, (_, i) => i);

  return (
    <View
      style={{
        position: "relative",
        width: svgWidth,
        height: svgHeight,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {state === "scanning" && (
        <>
          <RippleRing delay={0} totalSize={size} />
          <RippleRing delay={0.6} totalSize={size} />
          <RippleRing delay={1.2} totalSize={size} />
        </>
      )}

      {/* drop-shadow approximated via wrapper shadow — CSS filter not available in RN */}
      <View
        style={{
          shadowColor: "#0C141C",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
          elevation: 8,
        }}
      >
        <Svg width={svgWidth} height={svgHeight} viewBox="0 0 300 180">
          <Defs>
            <LinearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#5A636E" />
              <Stop offset="55%" stopColor="#3A424C" />
              <Stop offset="100%" stopColor="#222A33" />
            </LinearGradient>
            <LinearGradient id="plateGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#E2E4E7" />
              <Stop offset="55%" stopColor="#BCC0C5" />
              <Stop offset="100%" stopColor="#9CA2A9" />
            </LinearGradient>
            <LinearGradient id="strapGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#2A2F36" />
              <Stop offset="100%" stopColor="#13171C" />
            </LinearGradient>
            <ClipPath id="plateClip">
              <Path d="M150 38 L228 38 A50 50 0 0 1 228 142 L150 142 Z" />
            </ClipPath>
            <ClipPath id="bodyClip">
              <Rect x="60" y="38" width="180" height="104" rx="52" />
            </ClipPath>
          </Defs>

          {/* Left strap */}
          <Rect x="0" y="74" width="68" height="36" rx="6" fill="url(#strapGrad)" />
          <Rect x="0" y="74" width="68" height="2" fill="rgba(255,255,255,0.06)" />
          {/* Right strap */}
          <Rect x="232" y="74" width="68" height="36" rx="6" fill="url(#strapGrad)" />
          <Rect x="232" y="74" width="68" height="2" fill="rgba(255,255,255,0.06)" />

          {/* Body pill */}
          <Rect x="60" y="38" width="180" height="104" rx="52" fill="url(#bodyGrad)" />
          {/* Specular top highlight */}
          <Path d="M84 50 Q150 38 216 50" stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
          {/* Soft inner shadow on left edge */}
          <Ellipse cx="78" cy="90" rx="22" ry="42" fill="rgba(0,0,0,0.18)" />

          {/* Pogo pins */}
          <Circle cx="145" cy="58" r="3.4" fill="#C9A461" />
          <Circle cx="145" cy="58" r="1.4" fill="#F2D58C" />
          <Circle cx="160" cy="58" r="3.4" fill="#C9A461" />
          <Circle cx="160" cy="58" r="1.4" fill="#F2D58C" />

          {/* Brushed aluminum half-plate */}
          <G clipPath="url(#plateClip)">
            <Rect x="150" y="38" width="90" height="104" fill="url(#plateGrad)" />
            {brushLines.map((i) => (
              <Line
                key={`b${i}`}
                x1="150"
                y1={42 + i * 4}
                x2="232"
                y2={42 + i * 4}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.5"
              />
            ))}
            {brushLines.map((i) => (
              <Line
                key={`d${i}`}
                x1="150"
                y1={44 + i * 4}
                x2="232"
                y2={44 + i * 4}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="0.5"
              />
            ))}
            <Rect x="150" y="38" width="2" height="104" fill="rgba(0,0,0,0.25)" />
          </G>

          {/* Etched gently glyph on the plate */}
          <G transform="translate(192, 108)" opacity={0.55}>
            <Circle cx="0" cy="0" r="4.5" fill="#4B5159" />
            <Path d="M8 -6 C13 -3, 13 3, 8 6" stroke="#4B5159" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <Path d="M14 -10 C21 -5, 21 5, 14 10" stroke="#4B5159" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity={0.7} />
          </G>

          {/* LED indicator slot */}
          <Rect x="138" y="135" width="36" height="6" rx="3" fill="#0E141B" />
          {/* LED bar — animated */}
          <AnimatedRect
            x="140"
            y="136.5"
            width="32"
            height="3"
            rx="1.5"
            fill={pulseColor}
            animatedProps={ledAnimProps}
          />
          {/* LED soft bloom — animated */}
          <AnimatedEllipse
            cx="156"
            cy="138"
            rx="40"
            ry="10"
            fill={pulseColor}
            animatedProps={bloomAnimProps}
          />

          {/* Success check overlay on plate */}
          {state === "success" && (
            <G transform="translate(192, 78)">
              <Circle cx="0" cy="0" r="18" fill={tokens.color.cyanDeep} />
              <Path
                d="M-7 0 l5 5 l10 -10"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          )}
        </Svg>
      </View>
    </View>
  );
}
