/**
 * Dashboard Screen using the new design system
 *
 * This demonstrates the practical application of the design system
 * with improved consistency and maintainability
 */

import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { HamburgerMenu } from "~/components/ui/HamburgerMenu";
import { Header } from "~/components/ui/Header";
import { HelpModal } from "~/components/ui/HelpModal";
import { YearOfBirthModal } from "~/components/ui/YearOfBirthModal";
// Import the new design system
import {
  buttons,
  buttonText,
  colors,
  commonStyles,
  containers,
  emptyStates,
  spacing,
  typography,
} from "~/styles";
import { calculateNextAlarmOccurrence } from "~/utils/alarmUtils";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { devicesBeingDeleted } from "~/utils/deviceDeletionTracker";
import {
  hasSeenOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from "~/utils/userPreferences";

type DeviceWithAlarmsCount = RouterOutputs["device"]["getAll"][number];

interface Alarm {
  id: string;
  title: string;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  repeat: boolean;
  cronExpression: string | null;
  deviceId: string | null;
}

function DeviceCard({
  device,
  alarms,
}: {
  device: DeviceWithAlarmsCount;
  alarms: Alarm[];
}) {
  // Filter alarms for this device
  const deviceAlarms = React.useMemo(() => {
    return alarms.filter((alarm) => alarm.deviceId === device.id);
  }, [alarms, device.id]);

  // Calculate next alarm
  const nextAlarm = React.useMemo(() => {
    if (deviceAlarms.length === 0) return null;

    // Filter active alarms and calculate next occurrence for each
    const activeAlarms = deviceAlarms
      .filter(
        (alarm): alarm is Alarm & { cronExpression: string } =>
          alarm.isActive && alarm.cronExpression !== null,
      )
      .map((alarm) => {
        const scheduleInfo = calculateNextAlarmOccurrence({
          isActive: alarm.isActive,
          startDate: alarm.startDate,
          endDate: alarm.endDate,
          repeat: alarm.repeat,
          cronExpression: alarm.cronExpression,
        });
        return {
          alarm,
          scheduleInfo,
        };
      })
      .filter(
        ({ scheduleInfo }) =>
          scheduleInfo.status === "active" && scheduleInfo.nextOccurrence,
      )
      .sort((a, b) => {
        if (!a.scheduleInfo.nextOccurrence || !b.scheduleInfo.nextOccurrence)
          return 0;
        return (
          a.scheduleInfo.nextOccurrence.getTime() -
          b.scheduleInfo.nextOccurrence.getTime()
        );
      });

    return activeAlarms[0] ?? null;
  }, [deviceAlarms]);

  // Format next alarm time
  const formatNextAlarmTime = (date: Date) => {
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isTomorrow =
      date.getDate() === now.getDate() + 1 &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View style={{ marginBottom: spacing[6] }}>
      <Link
        href={{
          pathname: "/devices/[deviceId]",
          params: { deviceId: device.id },
        }}
        asChild
      >
        <Pressable
          style={({ pressed }) => [
            {
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: spacing[6],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 12,
              borderWidth: 2,
              borderColor: colors.primary[300],
            },
            pressed && { 
              opacity: 0.95, 
              transform: [{ scale: 0.98 }],
              shadowOpacity: 0.2,
            },
          ]}
        >
          {/* Device Header - Centered */}
          <View style={{ alignItems: "center", marginBottom: spacing[4] }}>
            {/* Device Title */}
            <Text
              style={[
                typography.h3,
                {
                  color: colors.text.primary,
                  fontWeight: "700",
                  textAlign: "center",
                  marginBottom: spacing[2],
                },
              ]}
            >
              {device.title}
            </Text>

            {/* Alarm Count - directly under title */}
            <Text
              style={[
                typography.body,
                {
                  color: colors.text.secondary,
                  textAlign: "center",
                },
              ]}
            >
              {device._count.alarms === 0
                ? "No alarms"
                : device._count.alarms === 1
                  ? "1 alarm"
                  : `${device._count.alarms} alarms`}
            </Text>
          </View>

          {/* Next Alarm - Prominent */}
          {nextAlarm?.scheduleInfo.nextOccurrence && (
            <View
              style={{
                backgroundColor: colors.primary[50],
                padding: spacing[4],
                borderRadius: 12,
                borderWidth: 2,
                borderColor: colors.primary[200],
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: spacing[2],
                }}
              >
                <Ionicons
                  name="notifications"
                  size={18}
                  color={colors.primary[600]}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.primary[600],
                      marginLeft: spacing[1],
                      textTransform: "uppercase",
                      fontWeight: "700",
                      letterSpacing: 1,
                    },
                  ]}
                >
                  Next Alarm
                </Text>
              </View>
              
              <Text
                style={[
                  typography.h5,
                  {
                    color: colors.text.primary,
                    textAlign: "center",
                    marginBottom: spacing[2],
                    fontWeight: "600",
                  },
                ]}
              >
                {nextAlarm.alarm.title}
              </Text>
              
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="time"
                  size={16}
                  color={colors.primary[700]}
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.primary[700],
                      marginLeft: spacing[2],
                      fontWeight: "700",
                    },
                  ]}
                >
                  {formatNextAlarmTime(nextAlarm.scheduleInfo.nextOccurrence)}
                </Text>
              </View>
            </View>
          )}

          {/* Tap to view indicator */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: spacing[4],
            }}
          >
            <Text
              style={[
                typography.caption,
                {
                  color: colors.text.tertiary,
                  marginRight: spacing[1],
                },
              ]}
            >
              Tap to view details
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={colors.text.tertiary}
            />
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const [showYearOfBirthModal, setShowYearOfBirthModal] = React.useState(false);
  const [showHelpModal, setShowHelpModal] = React.useState(false);

  // Fetch user profile to check year of birth
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => trpc.auth.getProfile.query(),
    enabled: !!session?.user,
  });

  // Check if user needs to provide year of birth and/or see onboarding
  React.useEffect(() => {
    const checkUserStatus = async () => {
      // Wait for user profile to load
      if (!userProfile) return;

      const hasSeenHelp = await hasSeenOnboarding();

      // First check: show year of birth modal if not in database
      if (!userProfile.yearOfBirth) {
        setShowYearOfBirthModal(true);
      }
      // Second check: show help modal if year of birth exists but haven't seen help
      else if (!hasSeenHelp) {
        setShowHelpModal(true);
      }
    };
    void checkUserStatus();
  }, [userProfile]);

  const {
    data: devices,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["devices"],
    queryFn: () => trpc.device.getAll.query({}),
    enabled: !!session?.user,
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // No garbage collection time - data removed immediately
  });

  // Fetch all alarms for the user
  const { data: allAlarms = [] } = useQuery({
    queryKey: ["alarms"],
    queryFn: () => trpc.alarm.getAll.query({}),
    enabled: !!session?.user,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      // Reset user preferences on logout
      await resetOnboarding();
      await authClient.signOut();
    },
    onSuccess: () => {
      router.replace("/");
    },
    onError: (error) => {
      console.error("❌ Failed to sign out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    },
  });

  const updateYearOfBirthMutation = useMutation({
    mutationFn: async (yearOfBirth: number) => {
      // Update user's year of birth via API
      return await trpc.auth.update.mutate({ yearOfBirth });
    },
    onSuccess: async () => {
      // Invalidate user profile to refetch with updated year of birth
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      
      setShowYearOfBirthModal(false);

      // Check if user needs to see help modal
      const hasSeenHelp = await hasSeenOnboarding();
      if (!hasSeenHelp) {
        setShowHelpModal(true);
      }
    },
    onError: (error) => {
      console.error("❌ Failed to update year of birth:", error);
      Alert.alert("Error", "Failed to save year of birth. Please try again.");
    },
  });

  const handleYearOfBirthComplete = (yearOfBirth: number) => {
    updateYearOfBirthMutation.mutate(yearOfBirth);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (session?.user) {
        // Don't refetch if any device is currently being deleted
        // This prevents the app from reloading during the deletion process
        if (devicesBeingDeleted.size > 0) {
          console.log(
            "⏸️ Skipping dashboard refetch - device deletion in progress",
          );
          return;
        }

        // Invalidate queries to ensure fresh data on next mount
        // The useQuery hook will automatically refetch due to refetchOnMount: "always"
        void queryClient.invalidateQueries({ queryKey: ["devices"] });
      }
    }, [session, queryClient]),
  );

  const handleAddDevice = () => {
    router.push("/add-device");
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", onPress: () => signOutMutation.mutate() },
    ]);
  };

  const handleUserProfile = () => {
    console.log(
      "🔧 Dashboard: Settings button pressed, navigating to /settings",
    );
    router.push("/settings");
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View style={commonStyles.fullScreenLoading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            style={[
              typography.body,
              { color: colors.text.secondary, marginTop: spacing[3] },
            ]}
          >
            Loading your Gentlys...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={containers.safeArea}>
        <View style={commonStyles.fullScreenLoading}>
          <Text style={[typography.h4, { color: colors.error[600] }]}>
            Something went wrong
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.text.secondary,
                textAlign: "center",
                marginTop: spacing[2],
                marginBottom: spacing[6],
              },
            ]}
          >
            {error.message}
          </Text>
          <Pressable
            style={[buttons.base, buttons.medium, buttons.primary]}
            onPress={() => refetch()}
          >
            <Text style={buttonText.primary}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <Header
        title="Your Gentlys"
        showBackButton={false}
        rightComponent={
          <HamburgerMenu
            options={[
              {
                label: "Help",
                onPress: () => setShowHelpModal(true),
                icon: "help-circle",
              },
              {
                label: "User Settings",
                onPress: handleUserProfile,
                icon: "settings",
              },
              {
                label: "Sign Out",
                onPress: handleSignOut,
                icon: "log-out",
                destructive: true,
              },
            ]}
          />
        }
      />

      {/* Content */}
      <View style={containers.content}>
        {!devices || devices.length === 0 ? (
          /* Empty State */
          <View style={emptyStates.container}>
            <Text style={[typography.h4, { marginBottom: spacing[2] }]}>
              No Gentlys yet
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: colors.text.secondary,
                  textAlign: "center",
                  lineHeight: 24,
                  marginBottom: spacing[8],
                },
              ]}
            >
              Add your first Gently to start managing alarms and notifications.
            </Text>
            <Pressable
              style={[buttons.base, buttons.large, buttons.success]}
              onPress={handleAddDevice}
            >
              <Text style={buttonText.success}>Add Your First Gently</Text>
            </Pressable>
          </View>
        ) : (
          /* Device List */
          <View style={{ paddingVertical: spacing[4] }}>
            <FlatList
              data={devices}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <DeviceCard device={item} alarms={allAlarms} />
              )}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={() => (
                <Pressable
                  style={[
                    buttons.base,
                    buttons.large,
                    buttons.outline,
                    { marginTop: spacing[4] },
                  ]}
                  onPress={handleAddDevice}
                >
                  <Text style={buttonText.outline}>+ Add Another Gently</Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>

      {/* Year of Birth Modal */}
      <YearOfBirthModal
        visible={showYearOfBirthModal}
        onComplete={handleYearOfBirthComplete}
        isLoading={updateYearOfBirthMutation.isPending}
      />

      {/* Help Modal */}
      <HelpModal
        visible={showHelpModal}
        onClose={async () => {
          setShowHelpModal(false);
          await markOnboardingComplete();
        }}
      />
    </SafeAreaView>
  );
}
