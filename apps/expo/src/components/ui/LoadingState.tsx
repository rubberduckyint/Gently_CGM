/**
 * LoadingState Component
 *
 * A consistent loading indicator for full-screen or inline loading states.
 */

import type { StyleProp, ViewStyle } from "react-native";
import { ActivityIndicator, Text, View } from "react-native";

import { colors, commonStyles, spacing, typography } from "~/styles";
import { loadingA11y } from "~/utils/accessibility";

interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Size of the loading indicator */
  size?: "small" | "large";
  /** Whether this is a full-screen loading state */
  fullScreen?: boolean;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({
  message = "Loading...",
  size = "large",
  fullScreen = true,
  style,
}: LoadingStateProps) {
  const a11yProps = loadingA11y(message);

  return (
    <View
      style={[
        fullScreen ? commonStyles.fullScreenLoading : { padding: spacing[4] },
        { alignItems: "center" },
        style,
      ]}
      {...a11yProps}
    >
      <ActivityIndicator size={size} color={colors.primary[500]} />
      {message && (
        <Text
          style={[
            typography.body,
            {
              marginTop: spacing[3],
              color: colors.gray[500],
              textAlign: "center",
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
