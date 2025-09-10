import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import {
  buttons,
  buttonText,
  colors,
  containers,
  flex,
  spacing,
  typography,
} from "~/styles";

export default function AlarmsIndexPage() {
  return (
    <SafeAreaView style={containers.safeArea}>
      <View
        style={[
          flex.flex1,
          flex.itemsCenter,
          flex.justifyCenter,
          { padding: spacing[6] },
        ]}
      >
        <Text style={[typography.h2, { marginBottom: spacing[4] }]}>
          Alarms
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.text.secondary,
              textAlign: "center",
              marginBottom: spacing[6],
            },
          ]}
        >
          To add an alarm, please go to the device detail page and tap the "Add
          Alarm" button.
        </Text>
        <Pressable
          style={[buttons.base, buttons.primary]}
          onPress={() => router.push("/dashboard")}
        >
          <Text style={[buttonText.primary]}>Go to Dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
