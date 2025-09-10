/**
 * Settings Screen
 *
 * Allows users to update their profile information
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";

import { NavigationBar } from "~/components/NavigationBar";
import {
  buttons,
  buttonText,
  colors,
  containers,
  inputs,
  spacing,
  typography,
} from "~/styles";
import { authClient } from "~/utils/auth";

export default function SettingsPage() {
  console.log("📱 SettingsPage: Component loaded successfully");

  const { data: session } = authClient.useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      // Implement the actual update profile API call here
      // This is a placeholder for the actual implementation
      return await new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1000);
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Profile updated successfully!");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to update profile");
    },
  });

  const handleSaveProfile = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    updateProfileMutation.mutate({ name: name.trim() });
  };

  return (
    <SafeAreaView style={containers.safeArea}>
      <View style={containers.content}>
        <View style={{ paddingVertical: spacing[6] }}>
          {/* Name Field */}
          <View style={inputs.container}>
            <Text style={inputs.label}>Full Name</Text>
            <TextInput
              style={inputs.base}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.tertiary}
              editable={!updateProfileMutation.isPending}
            />
          </View>

          {/* Email Field (Read-only) */}
          <View style={inputs.container}>
            <Text style={inputs.label}>Email Address</Text>
            <TextInput
              style={[inputs.base, { backgroundColor: colors.gray[100] }]}
              value={email}
              placeholder="Email address"
              placeholderTextColor={colors.text.tertiary}
              editable={false}
            />
            <Text
              style={[
                typography.caption,
                { color: colors.text.tertiary, marginTop: spacing[1] },
              ]}
            >
              Email cannot be changed from this screen
            </Text>
          </View>

          {/* Save Button */}
          <Pressable
            style={[
              buttons.base,
              buttons.large,
              buttons.primary,
              updateProfileMutation.isPending && buttons.disabled,
            ]}
            onPress={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={buttonText.primary}>Save Changes</Text>
            )}
          </Pressable>

          {/* Account Section */}
          <View
            style={{
              marginTop: spacing[10],
              paddingTop: spacing[6],
              borderTopWidth: 1,
              borderTopColor: colors.border.light,
            }}
          >
            <Text style={[typography.h5, { marginBottom: spacing[4] }]}>
              Account Information
            </Text>

            <View
              style={{
                backgroundColor: colors.gray[50],
                padding: spacing[4],
                borderRadius: 8,
                marginBottom: spacing[4],
              }}
            >
              <Text
                style={[typography.caption, { color: colors.text.secondary }]}
              >
                Account Status
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.success[600], marginTop: spacing[1] },
                ]}
              >
                ✓ Verified Account
              </Text>
            </View>

            <View
              style={{
                backgroundColor: colors.gray[50],
                padding: spacing[4],
                borderRadius: 8,
              }}
            >
              <Text
                style={[typography.caption, { color: colors.text.secondary }]}
              >
                Member Since
              </Text>
              <Text style={[typography.body, { marginTop: spacing[1] }]}>
                {session?.user.createdAt
                  ? new Date(session.user.createdAt).toLocaleDateString()
                  : "Unknown"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
