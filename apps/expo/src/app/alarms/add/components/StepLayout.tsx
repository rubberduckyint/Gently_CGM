import React from "react";
import { Text, View } from "react-native";

import { colors, flex, spacing, typography } from "~/styles";

interface StepLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function StepLayout({ title, subtitle, children }: StepLayoutProps) {
  return (
    <View style={[flex.flex1, { backgroundColor: colors.background.primary }]}>
      <View style={{ padding: spacing[6] }}>
        <Text style={[typography.h2, { marginBottom: spacing[2] }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              typography.body,
              { color: colors.text.secondary, marginBottom: spacing[6] },
            ]}
          >
            {subtitle}
          </Text>
        )}
        {children}
      </View>
    </View>
  );
}
