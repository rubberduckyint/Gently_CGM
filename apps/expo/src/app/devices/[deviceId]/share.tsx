/**
 * Device Sharing Screen
 * Allows device owners to manage who has access to their device
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "~/components/ui/Header";
import {
  buttons,
  buttonText,
  cards,
  colors,
  containers,
  inputs,
  spacing,
  typography,
} from "~/styles";
import { trpc } from "~/utils/api";

export default function ShareDevicePage() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [permission, setPermission] = useState<"READ" | "WRITE">("READ");
  const [isInviting, setIsInviting] = useState(false);

  // Get device details to show title
  const { data: device } = useQuery({
    queryKey: ["device", "getById", { id: deviceId }],
    queryFn: () => {
      if (!deviceId) throw new Error("Device ID required");
      return trpc.device.getById.query({ id: deviceId });
    },
    enabled: !!deviceId,
  });

  // Get shares for this device
  const {
    data: shares,
    isLoading: sharesLoading,
    refetch: refetchShares,
  } = useQuery({
    queryKey: ["deviceShares", deviceId],
    queryFn: async () => {
      const allShares = await trpc.deviceShare.getMyDeviceShares.query();
      return allShares.filter((s) => s.deviceId === deviceId);
    },
    enabled: !!deviceId,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (data: {
      deviceId: string;
      invitedEmail: string;
      permission: "READ" | "WRITE";
    }) => trpc.deviceShare.invite.mutate(data),
    onSuccess: (result) => {
      setInviteEmail("");
      void refetchShares();
      Alert.alert(
        "Invitation Sent",
        result.isNewUser
          ? `An invitation has been sent to ${inviteEmail}. They'll need to create an account to access the device.`
          : `${inviteEmail} has been invited to access this device.`,
      );
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to send invitation");
    },
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: (shareId: string) =>
      trpc.deviceShare.revokeAccess.mutate({ shareId }),
    onSuccess: () => {
      void refetchShares();
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to revoke access");
    },
  });

  // Update permission mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; permission: "READ" | "WRITE" }) =>
      trpc.deviceShare.update.mutate(data),
    onSuccess: () => {
      void refetchShares();
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to update permission");
    },
  });

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: (shareId: string) =>
      trpc.deviceShare.resendInvitation.mutate({ shareId }),
    onSuccess: () => {
      Alert.alert("Success", "Invitation resent successfully");
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to resend invitation");
    },
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    if (!deviceId) return;

    setIsInviting(true);
    try {
      await inviteMutation.mutateAsync({
        deviceId,
        invitedEmail: inviteEmail.trim().toLowerCase(),
        permission,
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = (shareId: string, email: string) => {
    Alert.alert(
      "Revoke Access",
      `Are you sure you want to remove ${email}'s access to this device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => revokeMutation.mutate(shareId),
        },
      ],
    );
  };

  const handleTogglePermission = (
    shareId: string,
    currentPermission: "READ" | "WRITE",
  ) => {
    const newPermission = currentPermission === "READ" ? "WRITE" : "READ";
    updateMutation.mutate({ id: shareId, permission: newPermission });
  };

  // Check if user is owner
  if (device && !device.isOwned) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <Header
          title="Share Device"
          showBackButton
          onBackPress={() => router.back()}
        />
        <View
          style={[
            containers.content,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={48}
            color={colors.text.tertiary}
          />
          <Text
            style={[
              typography.h4,
              { color: colors.text.secondary, marginTop: spacing[4] },
            ]}
          >
            Only the device owner can manage sharing
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header
        title={`Share ${device?.title ?? "Device"}`}
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={containers.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Invite Section */}
        <View style={[cards.base, { marginBottom: spacing[6] }]}>
          <Text style={[typography.h4, { marginBottom: spacing[4] }]}>
            Invite Someone
          </Text>

          <Text
            style={[
              typography.body,
              { color: colors.text.secondary, marginBottom: spacing[4] },
            ]}
          >
            Enter an email address to invite someone to access this device.
            They'll receive an invitation to accept.
          </Text>

          <TextInput
            style={[inputs.base, { marginBottom: spacing[3] }]}
            placeholder="Email address"
            placeholderTextColor={colors.text.tertiary}
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Permission Toggle */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text
              style={[
                typography.caption,
                { color: colors.text.secondary, marginBottom: spacing[2] },
              ]}
            >
              Permission Level
            </Text>
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <Pressable
                style={[
                  {
                    flex: 1,
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[4],
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      permission === "READ"
                        ? colors.primary[500]
                        : colors.border.medium,
                    backgroundColor:
                      permission === "READ"
                        ? colors.primary[50]
                        : "transparent",
                    alignItems: "center",
                  },
                ]}
                onPress={() => setPermission("READ")}
              >
                <Ionicons
                  name="eye"
                  size={24}
                  color={
                    permission === "READ"
                      ? colors.primary[600]
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        permission === "READ"
                          ? colors.primary[600]
                          : colors.text.secondary,
                      fontWeight: "600",
                      marginTop: spacing[1],
                    },
                  ]}
                >
                  View Only
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.text.tertiary,
                      textAlign: "center",
                      marginTop: spacing[1],
                    },
                  ]}
                >
                  Can view alarms and receive notifications
                </Text>
              </Pressable>

              <Pressable
                style={[
                  {
                    flex: 1,
                    paddingVertical: spacing[3],
                    paddingHorizontal: spacing[4],
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      permission === "WRITE"
                        ? colors.success[500]
                        : colors.border.medium,
                    backgroundColor:
                      permission === "WRITE"
                        ? colors.success[50]
                        : "transparent",
                    alignItems: "center",
                  },
                ]}
                onPress={() => setPermission("WRITE")}
              >
                <Ionicons
                  name="pencil"
                  size={24}
                  color={
                    permission === "WRITE"
                      ? colors.success[600]
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color:
                        permission === "WRITE"
                          ? colors.success[600]
                          : colors.text.secondary,
                      fontWeight: "600",
                      marginTop: spacing[1],
                    },
                  ]}
                >
                  Full Access
                </Text>
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.text.tertiary,
                      textAlign: "center",
                      marginTop: spacing[1],
                    },
                  ]}
                >
                  Can create and modify alarms
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[buttons.base, buttons.medium, buttons.primary]}
            onPress={handleInvite}
            disabled={isInviting || !inviteEmail.trim()}
          >
            {isInviting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={buttonText.primary}>Send Invitation</Text>
            )}
          </Pressable>
        </View>

        {/* Current Shares Section */}
        <View style={{ marginBottom: spacing[8] }}>
          <Text style={[typography.h4, { marginBottom: spacing[4] }]}>
            People with Access
          </Text>

          {sharesLoading ? (
            <ActivityIndicator color={colors.primary[500]} />
          ) : !shares || shares.length === 0 ? (
            <View
              style={[
                cards.base,
                {
                  alignItems: "center",
                  paddingVertical: spacing[8],
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={48}
                color={colors.text.tertiary}
              />
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.text.secondary,
                    marginTop: spacing[3],
                    textAlign: "center",
                  },
                ]}
              >
                No one else has access to this device yet.
              </Text>
            </View>
          ) : (
            shares.map((share) => (
              <View
                key={share.id}
                style={[
                  cards.base,
                  {
                    marginBottom: spacing[3],
                    flexDirection: "row",
                    alignItems: "center",
                  },
                ]}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      share.status === "PENDING"
                        ? colors.warning[100]
                        : share.permission === "WRITE"
                          ? colors.success[100]
                          : colors.primary[100],
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: spacing[3],
                  }}
                >
                  <Ionicons
                    name={
                      share.status === "PENDING"
                        ? "time"
                        : share.permission === "WRITE"
                          ? "pencil"
                          : "eye"
                    }
                    size={20}
                    color={
                      share.status === "PENDING"
                        ? colors.warning[600]
                        : share.permission === "WRITE"
                          ? colors.success[600]
                          : colors.primary[600]
                    }
                  />
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={[typography.body, { fontWeight: "600" }]}
                    numberOfLines={1}
                  >
                    {share.sharedWithUser?.name ?? share.invitedEmail}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.text.tertiary },
                      ]}
                    >
                      {share.invitedEmail}
                    </Text>
                    {share.status === "PENDING" && (
                      <View
                        style={{
                          backgroundColor: colors.warning[100],
                          paddingHorizontal: spacing[2],
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.warning[700],
                              fontSize: 10,
                              fontWeight: "600",
                            },
                          ]}
                        >
                          PENDING
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  {share.status === "PENDING" ? (
                    <Pressable
                      style={{
                        padding: spacing[2],
                        backgroundColor: colors.primary[50],
                        borderRadius: 8,
                      }}
                      onPress={() => resendMutation.mutate(share.id)}
                    >
                      <Ionicons
                        name="refresh"
                        size={20}
                        color={colors.primary[600]}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={{
                        padding: spacing[2],
                        backgroundColor:
                          share.permission === "WRITE"
                            ? colors.success[50]
                            : colors.primary[50],
                        borderRadius: 8,
                      }}
                      onPress={() =>
                        handleTogglePermission(share.id, share.permission)
                      }
                    >
                      <Ionicons
                        name={share.permission === "WRITE" ? "pencil" : "eye"}
                        size={20}
                        color={
                          share.permission === "WRITE"
                            ? colors.success[600]
                            : colors.primary[600]
                        }
                      />
                    </Pressable>
                  )}
                  <Pressable
                    style={{
                      padding: spacing[2],
                      backgroundColor: colors.error[50],
                      borderRadius: 8,
                    }}
                    onPress={() => handleRevoke(share.id, share.invitedEmail)}
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={colors.error[600]}
                    />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
