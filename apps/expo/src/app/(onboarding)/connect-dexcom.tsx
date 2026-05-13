import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  buttons,
  buttonText,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";

export default function ConnectDexcomHeroScreen() {
  return (
    <SafeAreaView style={containers.screen}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: spacing[8],
        }}
      >
        <Text
          style={[typography.h1, { textAlign: "center", marginBottom: spacing[4] }]}
        >
          One more step
        </Text>
        <Text
          style={[
            typography.body,
            {
              textAlign: "center",
              marginBottom: spacing[12],
              color: colors.text.secondary,
            },
          ]}
        >
          Connect your Dexcom Share account so Gently can keep watch for you.
        </Text>
        <Pressable
          style={[
            buttons.base,
            buttons.primary,
            { width: "100%", paddingVertical: spacing[4] },
          ]}
          onPress={() => router.push("/cgm/add")}
        >
          <Text style={[buttonText.primary, { fontSize: 18 }]}>
            Connect Dexcom Share
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
