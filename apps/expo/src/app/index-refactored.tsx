/**
 * Refactored Login Screen using the new design system
 * 
 * This demonstrates how to use the new style system for consistency and reusability
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { authClient } from "~/utils/auth";
// Import the new design system
import {
  colors,
  typography,
  spacing,
  containers,
  flex,
  buttons,
  buttonText,
  inputs,
  commonStyles,
  dividers,
} from "~/styles";

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [session]);

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      // Use better-auth magic link
      await authClient.$fetch("/magic-link/send", {
        method: "POST",
        body: {
          email: email.trim(),
          callbackURL: "gently://", // Use expo scheme for callback
        },
      });

      setEmailSent(true);
      Alert.alert(
        "Check Your Email",
        "We've sent a sign-in link to your email address. Click the link to continue.",
        [{ text: "OK" }],
      );
    } catch (error: unknown) {
      Alert.alert(
        "Failed to Send Magic Link",
        (error as Error).message || "Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    console.log("Google auth button pressed");
    setIsLoading(true);
    try {
      console.log("Starting Google social sign-in...");
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      console.log("Google sign-in result:", result);
      router.replace("/dashboard");
    } catch (error: unknown) {
      console.error("Google auth error:", error);
      Alert.alert(
        "Authentication Failed",
        (error as Error).message || "Failed to sign in with Google",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail("");
  };

  // Show loading while checking authentication status
  if (isPending) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View style={commonStyles.fullScreenLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={[typography.body, { marginTop: spacing[4], color: colors.text.secondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={containers.screen}
      >
        <View style={containers.contentCentered}>
          {/* Header */}
          <View style={commonStyles.headerSection}>
            <Text style={typography.h1}>Welcome to Gently</Text>
            <Text style={[typography.subtitle, { textAlign: 'center' }]}>
              {emailSent 
                ? "We've sent you a magic link!" 
                : "Sign in to your account to continue"
              }
            </Text>
          </View>

          {emailSent ? (
            /* Email sent state */
            <View style={commonStyles.centered}>
              <Text style={[typography.h5, { color: colors.success[600], textAlign: 'center', marginBottom: spacing[3] }]}>
                Check Your Email
              </Text>
              <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: spacing[6] }]}>
                We've sent a sign-in link to {email}. Click the link to continue to your dashboard.
              </Text>
              <Pressable 
                style={[buttons.base, buttons.medium, buttons.ghost]} 
                onPress={handleTryAgain}
              >
                <Text style={buttonText.ghost}>Try a different email</Text>
              </Pressable>
            </View>
          ) : (
            /* Login form */
            <View style={{ width: '100%' }}>
              {/* Email input */}
              <View style={inputs.container}>
                <Text style={inputs.label}>Email</Text>
                <TextInput
                  style={inputs.base}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Magic Link Button */}
              <Pressable
                style={[
                  buttons.base,
                  buttons.large,
                  buttons.primary,
                  isLoading && buttons.disabled
                ]}
                onPress={handleEmailAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <Text style={buttonText.primary}>
                    Send Magic Link
                  </Text>
                )}
              </Pressable>

              {/* Divider */}
              <View style={[commonStyles.dividerWithText, { marginVertical: spacing[6] }]}>
                <View style={dividers.line} />
                <Text style={[typography.caption, { paddingHorizontal: spacing[4] }]}>or</Text>
                <View style={dividers.line} />
              </View>

              {/* Google Sign In Button */}
              <Pressable
                style={[
                  buttons.base,
                  buttons.large,
                  buttons.secondary,
                  isLoading && buttons.disabled
                ]}
                onPress={handleGoogleAuth}
                disabled={isLoading}
              >
                <Text style={buttonText.secondary}>Continue with Google</Text>
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <View style={[flex.itemsCenter, { marginTop: spacing[12] }]}>
            <Text style={[typography.caption, { textAlign: 'center', color: colors.text.tertiary }]}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
