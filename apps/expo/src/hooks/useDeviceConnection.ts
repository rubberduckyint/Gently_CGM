/**
 * useDeviceConnection Hook
 *
 * Manages device connection state and auto-connection logic.
 * Extracted from device detail page for reusability and clarity.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import type { BLEConnectionProgress } from "~/contexts/BLEContext";
import { useBLE } from "~/contexts/BLEContext";

interface UseDeviceConnectionProps {
  serialNumber?: string;
  deviceId?: string;
  enabled?: boolean;
}

interface ConnectionProgress {
  message: string;
  progress: number;
}

export function useDeviceConnection({
  serialNumber,
  deviceId,
  enabled = true,
}: UseDeviceConnectionProps) {
  const {
    connectionState,
    connectToDevice,
    notifications,
    connectedDevice,
    encryptionKey,
  } = useBLE();

  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [connectionProgress, setConnectionProgress] =
    useState<ConnectionProgress | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const isMountedRef = useRef(true);

  // Battery status parsed from notifications
  const [batteryStatus, setBatteryStatus] = useState<{
    level: number;
    voltage: number;
    isCharging: boolean;
    levelText: string;
  } | null>(null);

  // Pulse animation for connection status
  const pulseScale = useSharedValue(1);

  // Update mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Animate pulse when connecting
  useEffect(() => {
    const shouldAnimate =
      connectionState === "connecting" ||
      connectionState === "scanning" ||
      connectionProgress !== null;

    if (shouldAnimate) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [connectionState, connectionProgress, pulseScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Parse battery status from notifications
  useEffect(() => {
    const latestBatteryNotification = notifications
      .filter((n) => n.type === "battery")
      .slice(-1)[0];

    if (latestBatteryNotification?.description) {
      const regex = /Battery: (\w+) \((\d+)mV\)(?: - (Charging))?/;
      const match = regex.exec(latestBatteryNotification.description);

      if (match) {
        const levelText = match[1] ?? "UNKNOWN";
        const voltage = parseInt(match[2] ?? "0", 10);
        const isCharging = match[3] === "Charging";

        const levelMap: Record<string, number> = {
          CRITICAL: 0,
          LOW: 1,
          MEDIUM: 2,
          GOOD: 3,
          FULL: 4,
        };

        setBatteryStatus({
          level: levelMap[levelText] ?? 0,
          voltage,
          isCharging,
          levelText,
        });
      }
    }
  }, [notifications]);

  // Handle progress updates
  const handleProgress = useCallback((progress: BLEConnectionProgress) => {
    setConnectionProgress({
      message: progress.message,
      progress: progress.progress,
    });
  }, []);

  // Auto-connect logic
  useEffect(() => {
    const autoConnect = async () => {
      if (autoConnectAttempted || !enabled) return;
      if (!isMountedRef.current) return;
      if (!deviceId || !serialNumber) return;
      if (connectionState === "connected" || connectionState === "connecting")
        return;

      console.log("🔄 Auto-connecting to device:", serialNumber);

      try {
        await connectToDevice(serialNumber, handleProgress, {
          maxRetries: 3,
          connectionTimeoutMs: 60000,
          stabilizationDelayMs: 900,
          mtuSize: 512,
          scanTimeoutSeconds: 30,
        });

        console.log("✅ Auto-connect successful!");
        setConnectionProgress(null);
        setConnectionError(null);
        setAutoConnectAttempted(true);
      } catch (error) {
        console.warn("⚠️ Auto-connect failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setConnectionError(errorMessage);
        setConnectionProgress(null);
        setShowRetryModal(true);
        setAutoConnectAttempted(true);
      }
    };

    void autoConnect();
  }, [
    serialNumber,
    deviceId,
    autoConnectAttempted,
    enabled,
    connectionState,
    connectToDevice,
    handleProgress,
  ]);

  // Manual reconnect
  const handleReconnect = useCallback(async () => {
    if (!serialNumber) {
      throw new Error("Device serial number is required for connection");
    }

    try {
      setConnectionProgress(null);
      setConnectionError(null);
      setShowRetryModal(false);

      await connectToDevice(serialNumber, handleProgress, {
        maxRetries: 3,
        connectionTimeoutMs: 60000,
        stabilizationDelayMs: 900,
        mtuSize: 512,
        scanTimeoutSeconds: 30,
      });

      console.log("✅ Manual reconnect successful!");
      setConnectionProgress(null);
      setConnectionError(null);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setConnectionError(errorMessage);
      setConnectionProgress(null);
      setShowRetryModal(true);
    }
  }, [serialNumber, connectToDevice, handleProgress]);

  // Close retry modal
  const closeRetryModal = useCallback(() => {
    setShowRetryModal(false);
  }, []);

  // Should show reconnect button
  const showReconnect =
    autoConnectAttempted &&
    connectionState !== "connecting" &&
    connectionState !== "scanning" &&
    connectionState !== "connected" &&
    !!serialNumber;

  return {
    connectionState,
    connectedDevice,
    encryptionKey,
    connectionProgress,
    connectionError,
    showRetryModal,
    batteryStatus,
    pulseAnimatedStyle,
    showReconnect,
    handleReconnect,
    closeRetryModal,
  };
}
