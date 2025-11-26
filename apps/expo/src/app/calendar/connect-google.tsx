/**
 * Google Calendar OAuth Connection Screen
 * Handles the OAuth flow for connecting Google Calendar using native Google Sign-In
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Header } from "~/components/ui/Header";
import {
  buttons,
  buttonText,
  cards,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";
import { signInWithGoogle } from "~/services/googleCalendar";
import { trpc } from "~/utils/api";

export default function ConnectGooglePage() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"initial" | "authorizing" | "saving">(
    "initial",
  );

  // Save connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: (data: {
      provider: "google";
      accountEmail: string;
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
    }) => trpc.calendar.createConnection.mutate(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendarConnections"] });
      Alert.alert("Success", "Google Calendar connected successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert("Error", `Failed to save connection: ${error.message}`);
      setIsProcessing(false);
      setStep("initial");
    },
  });

  const handleConnect = async () => {
    setIsProcessing(true);
    setStep("authorizing");

    try {
      // Sign in with Google and get calendar access
      const result = await signInWithGoogle();
      
      setStep("saving");

      // Save to database - note: native sign-in doesn't provide refresh tokens directly
      // The GoogleSignin library handles token refresh internally
      saveConnectionMutation.mutate({
        provider: "google",
        accountEmail: result.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? result.accessToken, // Use access token as fallback
        tokenExpiresAt: result.expiresAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect Google Calendar";
      
      if (errorMessage !== "Sign in cancelled") {
        Alert.alert("Authentication Failed", errorMessage);
      }
      
      setIsProcessing(false);
      setStep("initial");
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case "authorizing":
        return "Opening Google sign-in...";
      case "saving":
        return "Saving your connection...";
      default:
        return "";
    }
  };

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header
        title="Connect Google Calendar"
        showBackButton
      />

      <ScrollView
        style={containers.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingVertical: spacing[4], alignItems: "center" }}>
        <View style={{ alignItems: "center", maxWidth: 400, width: "100%" }}>
          {/* Icon */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.primary[50],
              alignItems: "center",
              justifyContent: "center",
              marginBottom: spacing[6],
            }}
          >
            <Ionicons name="logo-google" size={64} color={colors.primary[500]} />
          </View>

          {/* Title */}
          <Text
            style={[
              typography.h3,
              { textAlign: "center", marginBottom: spacing[3] },
            ]}
          >
            Connect Your Calendar
          </Text>

          {/* Description */}
          <Text
            style={[
              typography.body,
              {
                textAlign: "center",
                color: colors.text.secondary,
                marginBottom: spacing[6],
              },
            ]}
          >
            Sign in with Google to access your calendar events and create alarms
            automatically.
          </Text>

          {/* Permissions Info */}
          <View style={[cards.base, { marginBottom: spacing[6], width: "100%" }]}>
            <Text
              style={[
                typography.h6,
                { marginBottom: spacing[3], color: colors.text.primary },
              ]}
            >
              This app will be able to:
            </Text>

            {[
              "View your calendar events (read-only)",
              "Read event details (title, time, location)",
              "Access your Google account email",
            ].map((permission, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  marginBottom: spacing[2],
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success[500]}
                  style={{ marginRight: spacing[2], marginTop: 2 }}
                />
                <Text
                  style={[
                    typography.body,
                    { flex: 1, color: colors.text.secondary },
                  ]}
                >
                  {permission}
                </Text>
              </View>
            ))}

            <View
              style={{
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTopWidth: 1,
                borderTopColor: colors.border.light,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.text.secondary, fontStyle: "italic" },
                ]}
              >
                Note: We cannot create, modify, or delete any calendar events.
                This is read-only access.
              </Text>
            </View>
          </View>

          {/* Status Message */}
          {isProcessing && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: spacing[4],
              }}
            >
              <ActivityIndicator
                color={colors.primary[500]}
                style={{ marginRight: spacing[2] }}
              />
              <Text style={[typography.body, { color: colors.text.secondary }]}>
                {getStepMessage()}
              </Text>
            </View>
          )}

          {/* Connect Button */}
          <Pressable
            style={[
              buttons.base,
              buttons.large,
              buttons.primary,
              { width: "100%" },
            ]}
            onPress={handleConnect}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={24}
                  color={colors.text.inverse}
                  style={{ marginRight: spacing[2] }}
                />
                <Text style={buttonText.primary}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          {/* Privacy Note */}
          <Text
            style={[
              typography.caption,
              {
                textAlign: "center",
                color: colors.text.secondary,
                marginTop: spacing[4],
              },
            ]}
          >
            Your calendar data is stored securely and will never be shared with
            third parties.
          </Text>
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
