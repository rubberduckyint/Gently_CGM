/**
 * Calendar Integration Screen
 * Main hub for managing calendar connections and syncing events
 */

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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Header } from "~/components/ui/Header";
import { useCalendarSync, useWebhookRenewal } from "~/hooks";
import {
  generateChannelId,
  setupWatchChannel,
  signInWithGoogle,
  stopWatchChannel,
} from "~/services/googleCalendar";
import {
  buttons,
  buttonText,
  cards,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";
import { trpc } from "~/utils/api";

type CalendarProvider = "google" | "apple";

interface ProviderConfig {
  id: CalendarProvider;
  name: string;
  icon: "logo-google" | "logo-apple";
  color: string;
  available: boolean;
  comingSoon?: boolean;
}

const CALENDAR_PROVIDERS: ProviderConfig[] = [
  {
    id: "google",
    name: "Google Calendar",
    icon: "logo-google",
    color: "#4285F4",
    available: true,
  },
  {
    id: "apple",
    name: "Apple Calendar",
    icon: "logo-apple",
    color: "#000000",
    available: false,
    comingSoon: true,
  },
];

export default function CalendarPage() {
  const params = useLocalSearchParams();
  const deviceId = params.deviceId as string;
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<CalendarProvider | null>(
    null,
  );

  // Fetch calendar connections
  const {
    data: connections,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["calendarConnections"],
    queryFn: () => trpc.calendar.getConnections.query(),
  });

  // Calendar sync hook - handles automatic background sync
  const { isSyncing, lastSyncAt, lastSyncResult, syncAll } = useCalendarSync({
    autoSync: true,
    showAlerts: false,
    onChangesDetected: (changes: {
      updated: number;
      cancelled: number;
      updatedAlarmIds: string[];
      cancelledAlarmIds: string[];
    }) => {
      // Show a subtle notification when calendar events change
      if (changes.updated > 0 || changes.cancelled > 0) {
        const messages = [];
        if (changes.updated > 0) {
          messages.push(
            `${changes.updated} alarm${changes.updated > 1 ? "s" : ""} updated`,
          );
        }
        if (changes.cancelled > 0) {
          messages.push(
            `${changes.cancelled} event${changes.cancelled > 1 ? "s" : ""} removed`,
          );
        }
        Alert.alert("Calendar Synced", messages.join(", "));
      }
    },
  });

  // Webhook renewal - keeps push notifications active
  useWebhookRenewal({ enabled: true });

  // Pull-to-refresh handler
  const handleRefresh = async () => {
    await Promise.all([refetch(), syncAll(true)]);
  };

  // Save connection mutation
  const saveConnectionMutation = useMutation({
    mutationFn: async (data: {
      provider: "google";
      accountEmail: string;
      accessToken: string;
      refreshToken: string;
      tokenExpiresAt: Date;
    }) => {
      // Create the connection first
      const connection = await trpc.calendar.createConnection.mutate(data);

      if (!connection) {
        throw new Error("Failed to create connection");
      }

      // Try to register for push notifications (webhook)
      // This is optional - if it fails, we still have polling
      try {
        const webhookUrl = `${process.env.EXPO_PUBLIC_BASE_URL}/api/calendar/webhook`;

        // Only register webhook if we have a proper HTTPS URL (not localhost)
        if (webhookUrl.startsWith("https://")) {
          const channelId = generateChannelId();
          const watchInfo = await setupWatchChannel(
            data.accessToken,
            "primary",
            webhookUrl,
            channelId,
          );

          // Save watch info to database
          await trpc.calendar.updateWatchChannel.mutate({
            connectionId: connection.id,
            watchChannelId: watchInfo.channelId,
            watchResourceId: watchInfo.resourceId,
            watchExpiration: watchInfo.expiration,
          });

          console.log(
            "[Calendar] Webhook registered, expires:",
            watchInfo.expiration,
          );
        } else {
          console.log(
            "[Calendar] Skipping webhook registration - not using HTTPS",
          );
        }
      } catch (webhookError) {
        // Webhook registration failed, but connection is still valid
        // Polling will still work
        console.warn("[Calendar] Webhook registration failed:", webhookError);
      }

      return connection;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendarConnections"] });
      setIsConnecting(null);
    },
    onError: (error: Error) => {
      Alert.alert("Connection Failed", error.message);
      setIsConnecting(null);
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get connection details first to stop the webhook
      const connection = connections?.find((c) => c.id === id);

      // Try to stop the webhook if it exists
      if (connection?.watchChannelId && connection?.watchResourceId) {
        try {
          await stopWatchChannel(
            connection.accessToken,
            connection.watchChannelId,
            connection.watchResourceId,
          );
          console.log("[Calendar] Webhook stopped for connection:", id);
        } catch (error) {
          // Ignore errors - webhook might have already expired
          console.warn("[Calendar] Failed to stop webhook:", error);
        }
      }

      return trpc.calendar.deleteConnection.mutate({ id });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendarConnections"] });
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      trpc.calendar.toggleActive.mutate({ id, isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["calendarConnections"] });
    },
  });

  const handleConnectGoogle = async () => {
    setIsConnecting("google");

    try {
      const result = await signInWithGoogle();

      // Check if this email is already connected
      const existingConnection = connections?.find(
        (c) => c.provider === "google" && c.accountEmail === result.email,
      );

      if (existingConnection) {
        Alert.alert(
          "Already Connected",
          `${result.email} is already connected. Please sign in with a different Google account.`,
        );
        setIsConnecting(null);
        return;
      }

      saveConnectionMutation.mutate({
        provider: "google",
        accountEmail: result.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? result.accessToken,
        tokenExpiresAt: result.expiresAt,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to connect";

      if (errorMessage !== "Sign in cancelled") {
        Alert.alert("Connection Failed", errorMessage);
      }
      setIsConnecting(null);
    }
  };

  const handleDisconnect = (id: string, email: string) => {
    Alert.alert(
      "Disconnect Calendar",
      `Remove connection to ${email}? Any alarms created from this calendar will remain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => deleteConnectionMutation.mutate(id),
        },
      ],
    );
  };

  const handleSelectEvents = (connectionId: string) => {
    router.push(
      `/calendar/select-events?connectionId=${connectionId}&deviceId=${deviceId}`,
    );
  };

  const getConnectionsForProvider = (provider: CalendarProvider) => {
    return connections?.filter((c) => c.provider === provider) ?? [];
  };

  if (isLoading) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <Header title="Calendar" showBackButton />
        <View style={containers.contentCentered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header title="Calendar" showBackButton />

      <ScrollView
        style={containers.content}
        contentContainerStyle={{ paddingVertical: spacing[4] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Sync Status Banner */}
        {hasConnections && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: spacing[3],
              paddingVertical: spacing[2],
              backgroundColor: colors.gray[50],
              borderRadius: 8,
              marginBottom: spacing[4],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {isSyncing ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={colors.primary[500]}
                    style={{ marginRight: spacing[2] }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Syncing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.success[500]}
                    style={{ marginRight: spacing[2] }}
                  />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {lastSyncAt
                      ? `Last synced ${formatTimeAgo(lastSyncAt)}`
                      : "Pull to sync"}
                  </Text>
                </>
              )}
            </View>
            {lastSyncResult &&
              (lastSyncResult.updated > 0 || lastSyncResult.cancelled > 0) && (
                <Text
                  style={[typography.caption, { color: colors.primary[500] }]}
                >
                  {lastSyncResult.updated > 0 &&
                    `${lastSyncResult.updated} updated`}
                  {lastSyncResult.updated > 0 &&
                    lastSyncResult.cancelled > 0 &&
                    " • "}
                  {lastSyncResult.cancelled > 0 &&
                    `${lastSyncResult.cancelled} removed`}
                </Text>
              )}
          </View>
        )}

        {/* Hero Section - shown when no connections */}
        {!hasConnections && (
          <View style={{ alignItems: "center", marginBottom: spacing[6] }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary[50],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: spacing[4],
              }}
            >
              <Ionicons name="calendar" size={40} color={colors.primary[500]} />
            </View>
            <Text
              style={[
                typography.h4,
                { textAlign: "center", marginBottom: spacing[2] },
              ]}
            >
              Sync Your Calendar
            </Text>
            <Text
              style={[
                typography.body,
                {
                  textAlign: "center",
                  color: colors.text.secondary,
                  paddingHorizontal: spacing[4],
                },
              ]}
            >
              Connect your calendar to automatically create reminders for
              upcoming events.
            </Text>
          </View>
        )}

        {/* Connected Calendars Section */}
        {hasConnections && (
          <View style={{ marginBottom: spacing[6] }}>
            <Text
              style={[
                typography.h5,
                { marginBottom: spacing[3], color: colors.text.primary },
              ]}
            >
              Connected Calendars
            </Text>

            {connections.map((connection) => (
              <View
                key={connection.id}
                style={[cards.base, { marginBottom: spacing[3] }]}
              >
                {/* Connection Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing[3],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor:
                        connection.provider === "google"
                          ? "#E8F0FE"
                          : colors.gray[100],
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: spacing[3],
                    }}
                  >
                    <Ionicons
                      name={
                        connection.provider === "google"
                          ? "logo-google"
                          : "logo-apple"
                      }
                      size={20}
                      color={
                        connection.provider === "google" ? "#4285F4" : "#000000"
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={typography.h6}>{connection.accountEmail}</Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {connection.isActive ? "Active" : "Paused"}
                      {connection.lastSyncedAt &&
                        ` • Synced ${formatTimeAgo(new Date(connection.lastSyncedAt))}`}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      toggleActiveMutation.mutate({
                        id: connection.id,
                        isActive: !connection.isActive,
                      })
                    }
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        connection.isActive ? "pause-circle" : "play-circle"
                      }
                      size={28}
                      color={
                        connection.isActive
                          ? colors.warning[500]
                          : colors.success[500]
                      }
                    />
                  </Pressable>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: "row", gap: spacing[2] }}>
                  <Pressable
                    style={[
                      buttons.base,
                      buttons.primary,
                      { flex: 1, paddingVertical: spacing[3] },
                    ]}
                    onPress={() => handleSelectEvents(connection.id)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={colors.text.inverse}
                      style={{ marginRight: spacing[2] }}
                    />
                    <Text style={buttonText.primary}>Browse Events</Text>
                  </Pressable>

                  <Pressable
                    style={[
                      buttons.base,
                      {
                        paddingHorizontal: spacing[4],
                        paddingVertical: spacing[3],
                        backgroundColor: colors.gray[100],
                        borderColor: colors.gray[200],
                      },
                    ]}
                    onPress={() =>
                      handleDisconnect(connection.id, connection.accountEmail)
                    }
                  >
                    <Ionicons
                      name="unlink-outline"
                      size={18}
                      color={colors.text.secondary}
                    />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add Calendar Section */}
        <View>
          {hasConnections && (
            <Text
              style={[
                typography.h5,
                { marginBottom: spacing[3], color: colors.text.primary },
              ]}
            >
              Add Calendar
            </Text>
          )}

          {CALENDAR_PROVIDERS.map((provider) => {
            const existingConnections = getConnectionsForProvider(provider.id);
            const isCurrentlyConnecting = isConnecting === provider.id;

            return (
              <Pressable
                key={provider.id}
                style={[
                  cards.base,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: spacing[3],
                    opacity: provider.available ? 1 : 0.6,
                  },
                ]}
                onPress={() => {
                  if (!provider.available) return;
                  if (provider.id === "google") {
                    void handleConnectGoogle();
                  }
                }}
                disabled={!provider.available || isCurrentlyConnecting}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor:
                      provider.id === "google" ? "#E8F0FE" : colors.gray[100],
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: spacing[3],
                  }}
                >
                  {isCurrentlyConnecting ? (
                    <ActivityIndicator size="small" color={provider.color} />
                  ) : (
                    <Ionicons
                      name={provider.icon}
                      size={24}
                      color={provider.color}
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={typography.h6}>{provider.name}</Text>
                  {provider.comingSoon ? (
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Coming soon
                    </Text>
                  ) : existingConnections.length > 0 ? (
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {existingConnections.length} account
                      {existingConnections.length !== 1 ? "s" : ""} connected •
                      Add another
                    </Text>
                  ) : null}
                </View>

                {provider.available && !isCurrentlyConnecting && (
                  <Ionicons
                    name="add-circle"
                    size={24}
                    color={colors.primary[500]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Info Section */}
        <View
          style={{
            marginTop: spacing[4],
            padding: spacing[4],
            backgroundColor: colors.gray[50],
            borderRadius: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: spacing[2],
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={colors.success[500]}
              style={{ marginRight: spacing[2] }}
            />
            <Text style={[typography.h6, { color: colors.text.primary }]}>
              Your Privacy Matters
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>
            We only read your calendar events to help you create reminders. We
            never modify, share, or store your calendar data on our servers.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
