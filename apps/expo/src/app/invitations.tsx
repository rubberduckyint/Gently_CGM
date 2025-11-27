import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "~/components/ui/Header";
import {
  buttons,
  cards,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";
import { trpc } from "~/utils/api";

export default function InvitationsPage() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Get pending invitations for current user
  const {
    data: invitations,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["deviceShare", "getPendingInvitations"],
    queryFn: () => trpc.deviceShare.getPendingInvitations.query(),
  });

  // Respond to invitation mutation
  const respondMutation = useMutation({
    mutationFn: (data: { shareId: string; accept: boolean }) =>
      trpc.deviceShare.respondToInvitation.mutate(data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["deviceShare", "getPendingInvitations"],
      });
      void queryClient.invalidateQueries({ queryKey: ["device"] });
      Alert.alert(
        variables.accept ? "Invitation Accepted" : "Invitation Declined",
        variables.accept
          ? "You can now view this device from your dashboard."
          : "The invitation has been declined.",
      );
    },
    onError: (error) => {
      Alert.alert(
        "Error",
        error instanceof Error
          ? error.message
          : "Failed to respond to invitation",
      );
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleRespond = (shareId: string, accept: boolean) => {
    const actionText = accept ? "accept" : "decline";
    Alert.alert(
      `${accept ? "Accept" : "Decline"} Invitation`,
      `Are you sure you want to ${actionText} this invitation?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: accept ? "Accept" : "Decline",
          style: accept ? "default" : "destructive",
          onPress: () => respondMutation.mutate({ shareId, accept }),
        },
      ],
    );
  };

  const getPermissionLabel = (permission: string) => {
    return permission === "WRITE" ? "Read & Write" : "Read Only";
  };

  const getPermissionDescription = (permission: string) => {
    return permission === "WRITE"
      ? "You can view and create/modify alarms"
      : "You can view alarms but not modify them";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <Header
          title="Invitations"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={containers.contentCentered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header
        title="Invitations"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={containers.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {!invitations || invitations.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: spacing[16],
              paddingHorizontal: spacing[4],
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.gray[100],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing[4],
              }}
            >
              <Ionicons
                name="mail-open-outline"
                size={40}
                color={colors.gray[400]}
              />
            </View>
            <Text
              style={[
                typography.h6,
                {
                  color: colors.gray[700],
                  textAlign: "center",
                  marginBottom: spacing[2],
                },
              ]}
            >
              No Pending Invitations
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.gray[500], textAlign: "center" },
              ]}
            >
              When someone shares a device with you, the invitation will appear
              here.
            </Text>
          </View>
        ) : (
          <View style={{ paddingVertical: spacing[4] }}>
            <Text
              style={[
                typography.body,
                {
                  color: colors.gray[600],
                  marginBottom: spacing[4],
                  paddingHorizontal: spacing[4],
                },
              ]}
            >
              You have {invitations.length} pending invitation
              {invitations.length !== 1 ? "s" : ""}
            </Text>

            {invitations.map((invitation) => (
              <View
                key={invitation.id}
                style={[
                  cards.base,
                  {
                    marginHorizontal: spacing[4],
                    marginBottom: spacing[3],
                    borderLeftWidth: 4,
                    borderLeftColor: colors.secondary[500],
                  },
                ]}
              >
                {/* Device Info */}
                <View style={{ marginBottom: spacing[3] }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: spacing[1],
                    }}
                  >
                    <Ionicons
                      name="watch-outline"
                      size={20}
                      color={colors.secondary[600]}
                      style={{ marginRight: spacing[2] }}
                    />
                    <Text
                      style={[
                        typography.h6,
                        { color: colors.gray[900], flex: 1 },
                      ]}
                    >
                      {invitation.device.title ?? "Gently Device"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.gray[500], marginLeft: spacing[7] },
                    ]}
                  >
                    Serial: {invitation.device.serialNumber}
                  </Text>
                </View>

                {/* Shared By */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing[3],
                    paddingTop: spacing[2],
                    borderTopWidth: 1,
                    borderTopColor: colors.border.light,
                  }}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.gray[500]}
                    style={{ marginRight: spacing[2] }}
                  />
                  <Text style={[typography.body, { color: colors.gray[600] }]}>
                    Shared by:{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {invitation.invitedByUser?.email ?? "Unknown"}
                    </Text>
                  </Text>
                </View>

                {/* Permission */}
                <View
                  style={{
                    backgroundColor:
                      invitation.permission === "WRITE"
                        ? colors.success[50]
                        : colors.secondary[50],
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    borderRadius: 6,
                    marginBottom: spacing[4],
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={
                        invitation.permission === "WRITE"
                          ? "create-outline"
                          : "eye-outline"
                      }
                      size={16}
                      color={
                        invitation.permission === "WRITE"
                          ? colors.success[700]
                          : colors.secondary[700]
                      }
                      style={{ marginRight: spacing[2] }}
                    />
                    <Text
                      style={[
                        typography.label,
                        {
                          color:
                            invitation.permission === "WRITE"
                              ? colors.success[700]
                              : colors.secondary[700],
                        },
                      ]}
                    >
                      {getPermissionLabel(invitation.permission)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      {
                        color:
                          invitation.permission === "WRITE"
                            ? colors.success[600]
                            : colors.secondary[600],
                        marginTop: spacing[1],
                        marginLeft: spacing[6],
                      },
                    ]}
                  >
                    {getPermissionDescription(invitation.permission)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: spacing[3] }}>
                  <Pressable
                    style={[
                      buttons.base,
                      {
                        flex: 1,
                        backgroundColor: colors.gray[100],
                        borderWidth: 1,
                        borderColor: colors.gray[300],
                      },
                    ]}
                    onPress={() => handleRespond(invitation.id, false)}
                    disabled={respondMutation.isPending}
                  >
                    <Text
                      style={[
                        typography.labelLarge,
                        { color: colors.gray[700] },
                      ]}
                    >
                      Decline
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[buttons.base, buttons.primary, { flex: 1 }]}
                    onPress={() => handleRespond(invitation.id, true)}
                    disabled={respondMutation.isPending}
                  >
                    {respondMutation.isPending ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.text.inverse}
                      />
                    ) : (
                      <Text
                        style={[
                          typography.labelLarge,
                          { color: colors.text.inverse },
                        ]}
                      >
                        Accept
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
