import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

export default function DeviceSuccessPage() {
  const { deviceName, fromDashboard } = useLocalSearchParams<{
    deviceName: string;
    fromDashboard?: string;
  }>();

  // Auto-navigate after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleContinue();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    router.replace("/dashboard");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>

          <Text style={styles.successTitle}>Device Added Successfully!</Text>

          <Text style={styles.successMessage}>
            {deviceName} has been connected and added to your account.
          </Text>

          <Text style={styles.instructionText}>
            You can now create gentle alarms and sync with your device.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successContainer: {
    alignItems: "center",
    width: "100%",
    marginBottom: 40,
  },
  successIcon: {
    backgroundColor: "#dcfce7",
    borderRadius: 50,
    padding: 20,
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#059669",
    marginBottom: 16,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 18,
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  instructionText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  actions: {
    width: "100%",
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#10b981",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
