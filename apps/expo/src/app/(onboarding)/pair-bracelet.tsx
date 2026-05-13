import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";

import { colors } from "~/styles";

export default function PairBraceletScreen() {
  useEffect(() => {
    router.replace("/add-device");
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
    </View>
  );
}
