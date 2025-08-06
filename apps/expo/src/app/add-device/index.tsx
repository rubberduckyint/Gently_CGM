import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";

import type { BluetoothDevice } from "~/services/bluetooth";
import { useBluetooth } from "~/services/bluetooth";
import { trpc } from "~/utils/api";

type ConnectionStep =
  | "scanning"
  | "found"
  | "connecting"
  | "connected"
  | "error";

export default function AddDevicePage() {
  const [step, setStep] = useState<ConnectionStep>("scanning");
  const [foundDevices, setFoundDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deviceInfo, setDeviceInfo] = useState<{
    serialNumber: string;
    firmwareVersion: string;
    batteryLevel: number;
  } | null>(null);

  // Keep track of found device IDs to prevent duplicates
  const foundDeviceIds = useRef(new Set<string>());

  const {
    startScan: bluetoothStartScan,
    stopScan,
    connect,
    disconnect,
    getDeviceInfo,
    isScanning: bluetoothScanning,
    connectedDevice,
  } = useBluetooth();

  const addDeviceMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      serialNumber: string;
      firmwareVersion: string;
      batteryLevel: number;
    }) => {
      return await trpc.device.create.mutate(params);
    },
    onSuccess: () => {
      router.push("/add-device/success");
    },
    onError: (error) => {
      setErrorMessage(`Failed to save device: ${error.message}`);
      setStep("error");
    },
  });

  const handleDeviceFound = useCallback((device: BluetoothDevice) => {
    if (!foundDeviceIds.current.has(device.id)) {
      foundDeviceIds.current.add(device.id);
      setFoundDevices((prev) => [...prev, device]);
    }
  }, []);

  const startScan = useCallback(async () => {
    try {
      setStep("scanning");
      setFoundDevices([]);
      foundDeviceIds.current.clear();
      setErrorMessage("");
      setIsScanning(true);

      await bluetoothStartScan(handleDeviceFound, { timeout: 10000 });

      setIsScanning(false);
      setStep("found");
    } catch (error) {
      setIsScanning(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to scan for devices",
      );
      setStep("error");
    }
  }, [bluetoothStartScan, handleDeviceFound]);

  const handleDeviceSelect = async (device: BluetoothDevice) => {
    setSelectedDevice(device);
    setStep("connecting");
    setIsConnecting(true);

    try {
      const connectedDevice = await connect(device.id);

      // Get device information
      const info = await getDeviceInfo(connectedDevice);
      setDeviceInfo(info);

      setIsConnecting(false);
      setStep("connected");
    } catch (error) {
      setIsConnecting(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect to device",
      );
      setStep("error");
    }
  };

  const handleSaveDevice = () => {
    if (!selectedDevice || !deviceInfo) return;

    const deviceTitle = selectedDevice.name || "Unknown Device";
    const deviceDescription = `Bluetooth device (${selectedDevice.id.slice(-6)})`;

    addDeviceMutation.mutate({
      title: deviceTitle,
      description: deviceDescription,
      serialNumber: deviceInfo.serialNumber,
      firmwareVersion: deviceInfo.firmwareVersion,
      batteryLevel: deviceInfo.batteryLevel,
    });
  };

  const handleRetry = () => {
    setErrorMessage("");
    setStep("scanning");
    startScan();
  };

  const handleBack = () => {
    router.back();
  };

  // Start scanning when component mounts
  useEffect(() => {
    startScan();

    // Cleanup on unmount
    return () => {
      stopScan();
      if (connectedDevice) {
        disconnect().catch(console.error);
      }
    };
  }, []);

  const renderScanningStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Scanning for Devices</Text>
      <Text style={styles.stepDescription}>
        Make sure your device is in pairing mode and nearby
      </Text>
      <ActivityIndicator size="large" color="#3b82f6" style={styles.spinner} />
      <Text style={styles.scanningText}>Looking for nearby devices...</Text>
      <Pressable style={styles.cancelButton} onPress={handleBack}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );

  const renderFoundStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Found Devices</Text>
      <Text style={styles.stepDescription}>
        Select your device from the list below
      </Text>
      {foundDevices.length === 0 ? (
        <View style={styles.noDevicesContainer}>
          <Text style={styles.noDevicesText}>No devices found</Text>
          <Pressable style={styles.retryButton} onPress={startScan}>
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.deviceList}>
          {foundDevices.map((device) => (
            <Pressable
              key={device.id}
              style={styles.deviceItem}
              onPress={() => handleDeviceSelect(device)}
            >
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>
                  {device.name || "Unknown Device"}
                </Text>
                <Text style={styles.deviceId}>{device.id}</Text>
                <Text style={styles.deviceRssi}>Signal: {device.rssi} dBm</Text>
              </View>
              <Text style={styles.connectText}>Connect</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={styles.bottomButtons}>
        <Pressable style={styles.retryButton} onPress={startScan}>
          <Text style={styles.retryButtonText}>Scan Again</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={handleBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderConnectingStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Connecting</Text>
      <Text style={styles.stepDescription}>
        Connecting to {selectedDevice?.name || "device"}...
      </Text>
      <ActivityIndicator size="large" color="#3b82f6" style={styles.spinner} />
      <Text style={styles.connectingText}>This may take a few moments</Text>
    </View>
  );

  const renderConnectedStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Device Connected</Text>
      <Text style={styles.stepDescription}>
        Successfully connected to {selectedDevice?.name || "device"}
      </Text>

      {deviceInfo && (
        <View style={styles.deviceInfoContainer}>
          <Text style={styles.deviceInfoTitle}>Device Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Serial Number:</Text>
            <Text style={styles.infoValue}>{deviceInfo.serialNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firmware:</Text>
            <Text style={styles.infoValue}>{deviceInfo.firmwareVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Battery:</Text>
            <Text style={styles.infoValue}>{deviceInfo.batteryLevel}%</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomButtons}>
        <Pressable
          style={[
            styles.saveButton,
            addDeviceMutation.isPending && styles.saveButtonDisabled,
          ]}
          onPress={handleSaveDevice}
          disabled={addDeviceMutation.isPending}
        >
          {addDeviceMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Device</Text>
          )}
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={handleBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Connection Error</Text>
      <Text style={styles.errorText}>{errorMessage}</Text>
      <View style={styles.bottomButtons}>
        <Pressable style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
        <Pressable style={styles.cancelButton} onPress={handleBack}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case "scanning":
        return renderScanningStep();
      case "found":
        return renderFoundStep();
      case "connecting":
        return renderConnectingStep();
      case "connected":
        return renderConnectedStep();
      case "error":
        return renderErrorStep();
      default:
        return renderScanningStep();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Add New Device</Text>
      </View>
      {renderStep()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "white",
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    textAlign: "center",
    marginRight: 60, // Balance the back button
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: "center",
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  scanningText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 32,
  },
  connectingText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  deviceList: {
    width: "100%",
    maxHeight: 400,
  },
  deviceItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  deviceRssi: {
    fontSize: 12,
    color: "#6b7280",
  },
  connectText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "500",
  },
  noDevicesContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  noDevicesText: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 16,
  },
  deviceInfoContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deviceInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  saveButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
});
