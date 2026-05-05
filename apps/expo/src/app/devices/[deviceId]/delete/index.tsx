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
import { router, useGlobalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useBLE } from "~/contexts/BLEContext";
import {
  buttons,
  cards,
  colors,
  containers,
  spacing,
  typography,
} from "~/styles";
import { trpc } from "~/utils/api";
import { devicesBeingDeleted } from "~/utils/deviceDeletionTracker";

export default function DeleteDevicePage() {
  const { deviceId } = useGlobalSearchParams<{ deviceId: string }>();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const { connectionState, disconnectDevice, connectedDevice } =
    useBLE();

  const {
    data: device,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["device", "getById", { id: deviceId }],
    queryFn: async () => {
      console.log(`🔍 [Delete Device] Fetching device: ${deviceId}`);
      return await trpc.device.getById.query({ id: deviceId });
    },
    enabled: !!deviceId,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deviceId) throw new Error("Device ID is required");

      setIsDeleting(true);

      // Check if the current connected device matches the one being deleted
      console.log("🔍 Checking BLE connection before deletion...");
      console.log("   └─ Connected device:", connectedDevice);
      console.log("   └─ Device to delete:", device?.serialNumber);
      console.log("   └─ Connection state:", connectionState);

      if (connectedDevice && device?.serialNumber) {
        // Check if the connected device's serial number matches this device
        if (connectedDevice.serialNumber === device.serialNumber) {
          console.log(
            `Device ${device.serialNumber} is connected, disconnecting before deletion...`,
          );

          // Disconnect the device
          try {
            await disconnectDevice();
            console.log(`Disconnected device: ${device.serialNumber}`);
          } catch (disconnectError) {
            console.warn(
              `Failed to disconnect ${device.serialNumber}:`,
              disconnectError,
            );
          }
        }
      }

      // Delete the device from the database
      console.log("🗑️ Deleting device from database...");
      return await trpc.device.delete.mutate({ id: deviceId });
    },
    onSuccess: () => {
      console.log("✅ Device deleted successfully from database");

      // Remove device from deletion tracker
      if (deviceId) {
        devicesBeingDeleted.delete(deviceId);
        console.log("✅ Removed device from deletion tracker:", deviceId);
      }

      // Invalidate the devices list so it refetches on the dashboard
      void queryClient.invalidateQueries({
        queryKey: ["devices"],
      });
      void queryClient.invalidateQueries({
        queryKey: [["device", "getAll"]],
      });

      // Use a setTimeout to ensure all cleanup happens before navigation
      // This prevents race conditions with mounted components
      setTimeout(() => {
        // Dismiss all modals and navigate to dashboard, replacing the entire stack
        router.dismissAll();
        router.replace("/dashboard");
      }, 100);
    },
    onError: (error) => {
      console.error("❌ Device deletion failed:", error);
      setIsDeleting(false);

      // Remove device from deletion tracker on error
      if (deviceId) {
        devicesBeingDeleted.delete(deviceId);
        console.log(
          "🔄 Removed device from deletion tracker after error:",
          deviceId,
        );
      }

      Alert.alert(
        "Deletion Failed",
        `Could not delete device: ${error instanceof Error ? error.message : "Unknown error"}`,
        [{ text: "OK" }],
      );
    },
  });

  const handleCancel = () => {
    // Remove device from deletion tracker when canceling
    if (deviceId) {
      devicesBeingDeleted.delete(deviceId);
      console.log(
        "🔄 Removed device from deletion tracker (canceled):",
        deviceId,
      );
    }
    router.back();
  };

  const handleConfirmDelete = async () => {
    if (!deviceId) return;

    // CRITICAL: Mark device as being deleted FIRST
    // This prevents the device detail page from auto-connecting
    devicesBeingDeleted.add(deviceId);
    console.log("🚫 Marked device as being deleted:", deviceId);

    // Then cancel any in-flight queries and remove cached data
    // This prevents the device detail page from refetching after deletion
    await queryClient.cancelQueries({
      queryKey: ["device", "getById", { id: deviceId }],
    });

    void queryClient.removeQueries({
      queryKey: ["device", "getById", { id: deviceId }],
    });

    // Now start the deletion mutation
    deleteMutation.mutate();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={containers.safeArea}>
        {/* Custom Header */}
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[200],
            },
          ]}
        >
          <Pressable
            style={[{ position: "absolute", left: spacing[4], zIndex: 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray[700]} />
          </Pressable>
          <View style={[{ flex: 1, alignItems: "center" }]}>
            <Text style={[typography.h6]}>Delete Gently</Text>
          </View>
        </View>
        <View style={containers.contentCentered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            style={[
              typography.body,
              { marginTop: spacing[3], color: colors.gray[500] },
            ]}
          >
            Loading gently...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !device) {
    return (
      <SafeAreaView style={containers.safeArea}>
        {/* Custom Header */}
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              borderBottomWidth: 1,
              borderBottomColor: colors.gray[200],
            },
          ]}
        >
          <Pressable
            style={[{ position: "absolute", left: spacing[4], zIndex: 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.gray[700]} />
          </Pressable>
          <View style={[{ flex: 1, alignItems: "center" }]}>
            <Text style={[typography.h6]}>Delete Device</Text>
          </View>
        </View>
        <View
          style={[
            containers.contentCentered,
            { alignItems: "center", paddingHorizontal: spacing[8] },
          ]}
        >
          <Text
            style={[
              typography.h5,
              {
                color: colors.error[600],
                marginBottom: spacing[2],
                textAlign: "center",
              },
            ]}
          >
            Device not found
          </Text>
          <Text
            style={[
              typography.body,
              {
                color: colors.gray[500],
                textAlign: "center",
                marginBottom: spacing[6],
              },
            ]}
          >
            {error?.message ?? "The device could not be loaded"}
          </Text>
          <Pressable
            style={[buttons.base, buttons.primary]}
            onPress={() => router.push("/dashboard")}
          >
            <Text
              style={[typography.labelLarge, { color: colors.text.inverse }]}
            >
              Go to Dashboard
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containers.safeArea}>
      <ScrollView
        style={containers.content}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            {/* Warning Icon and Message */}
            <View
              style={[
                cards.base,
                {
                  alignItems: "center",
                  paddingVertical: spacing[2],
                  backgroundColor: colors.error[50],
                  borderColor: colors.error[200],
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons
                name="warning"
                size={64}
                color={colors.error[600]}
                style={{ marginBottom: spacing[4] }}
              />
              <Text
                style={[
                  typography.h4,
                  {
                    color: colors.error[600],
                    marginBottom: spacing[2],
                    textAlign: "center",
                  },
                ]}
              >
                Delete Gently?
              </Text>
              <Text
                style={[
                  typography.body,
                  {
                    color: colors.error[700],
                    textAlign: "center",
                    marginBottom: spacing[4],
                  },
                ]}
              >
                This action cannot be undone
              </Text>
            </View>

            {/* Device Information */}
            <View style={[cards.base]}>
              <Text
                style={[
                  typography.h6,
                  {
                    marginBottom: spacing[3],
                    color: colors.text.primary,
                  },
                ]}
              >
                Gently to be deleted:
              </Text>
              <View style={{ gap: spacing[2] }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[2],
                  }}
                >
                  <Ionicons name="watch" size={20} color={colors.gray[500]} />
                  <Text style={[typography.labelLarge, { flex: 1 }]}>
                    {device.title}
                  </Text>
                </View>
                {device.serialNumber && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing[2],
                    }}
                  >
                    <Ionicons
                      name="barcode-outline"
                      size={20}
                      color={colors.gray[500]}
                    />
                    <Text
                      style={[
                        typography.body,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {device.serialNumber}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* What will happen */}
            <View style={[cards.base]}>
              <Text
                style={[
                  typography.h6,
                  {
                    marginBottom: spacing[3],
                    color: colors.text.primary,
                  },
                ]}
              >
                What will happen:
              </Text>
              <View style={{ gap: spacing[3] }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing[2],
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.error[500]}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={[
                      typography.body,
                      { flex: 1, color: colors.text.primary },
                    ]}
                  >
                    The Gently will be disconnected from your account
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing[2],
                  }}
                >
                  <Ionicons
                    name="trash"
                    size={20}
                    color={colors.error[500]}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={[
                      typography.body,
                      { flex: 1, color: colors.text.primary },
                    ]}
                  >
                    Device data will be removed
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing[2],
                  }}
                >
                  <Ionicons
                    name="server"
                    size={20}
                    color={colors.error[500]}
                    style={{ marginTop: 2 }}
                  />
                  <Text
                    style={[
                      typography.body,
                      { flex: 1, color: colors.text.primary },
                    ]}
                  >
                    All Gently data will be permanently deleted from our servers
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: spacing[3],
              paddingTop: spacing[6],
              paddingBottom: spacing[4],
            }}
          >
            <Pressable
              style={[
                buttons.base,
                buttons.medium,
                buttons.outline,
                isDeleting && { opacity: 0.5 },
                { flex: 1 },
              ]}
              onPress={handleCancel}
              disabled={isDeleting}
            >
              <Text
                style={[typography.labelLarge, { color: colors.text.primary }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                buttons.base,
                buttons.medium,
                buttons.error,
                isDeleting && { opacity: 0.5 },
                { flex: 1 },
              ]}
              onPress={handleConfirmDelete}
              disabled={isDeleting}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={colors.text.inverse}
                    />
                    <Text
                      style={[
                        typography.labelLarge,
                        { color: colors.text.inverse },
                      ]}
                    >
                      Deleting...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="trash"
                      size={20}
                      color={colors.text.inverse}
                    />
                    <Text
                      style={[
                        typography.labelLarge,
                        { color: colors.text.inverse },
                      ]}
                    >
                      Delete Gently
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
