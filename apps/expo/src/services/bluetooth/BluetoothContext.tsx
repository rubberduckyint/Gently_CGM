/**
 * Global Bluetooth Context Provider
 * Maintains Bluetooth connec// Global state for Bluetooth manager and keys (persists across component unmounts)
let globalBleManager: BleManager | null = null;
const globalCustomKeys = new Map<string, Uint8Array>();
let globalScanStopFunction: (() => void) | null = null;
const globalScannedDevices = new Map<string, BluetoothDevice>();
let globalDisconnectionSubscription: { remove: () => void } | null = null;
let glob    try {
      // Check if device is already connected first
      const existingConnection = await isDeviceIdConnected(deviceId);
      if (existingConnection.isConnected) {
        console.log(`✅ BluetoothProvider: Device ${deviceId} is already connected, reusing connection`);
        if (!existingConnection.device || !existingConnection.protocol) {
          throw new Error("Missing device or protocol in existing connection");
        }
        return {
          device: existingConnection.device,
          protocol: existingConnection.protocol,
          deviceInfo: existingConnection.deviceInformation ?? {
            hardwareVersion: 1,
            firmwareVersionMajor: 1,
            firmwareVersionMinor: 0,
            firmwareBuildNumber: 1,
          },
          uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for existing connection
        };
      }

      // Get stored custom key if available
      const storedCustomKey = getStoredCustomKey(deviceId);lse;ate and custom keys across page navigations
 */

import type { ReactNode } from "react";
import type { Device, State } from "react-native-ble-plx";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { BleManager } from "react-native-ble-plx";

import type { SecureConnectionResult } from "./connection";
import type { DeviceInformation, GentlyBLEProtocol } from "./protocol";
import type {
  BluetoothDevice,
  BluetoothState,
  DeviceInfo,
  ScanCallbacks,
  ScanOptions,
} from "./types";
import { connectToGentlyDevice } from "./connection";
import { initializeBluetooth } from "./permissions";
import { startDeviceScan } from "./scanning";

// Global Bluetooth context interface
interface BluetoothContextType {
  // State
  isInitialized: boolean;
  isScanning: boolean;
  connectedDevice: Device | null;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
  lastError: string | null;
  protocol: GentlyBLEProtocol | null;
  deviceInformation: DeviceInformation | null;

  // Actions
  getBluetoothState: () => Promise<State>;
  startScan: (
    options?: ScanOptions,
    callbacks?: ScanCallbacks,
  ) => Promise<void>;
  stopScan: () => void;
  connect: (deviceId: string) => Promise<SecureConnectionResult>;
  connectById: (deviceId: string) => Promise<SecureConnectionResult>;
  connectBySerialNumber: (
    serialNumber: string,
  ) => Promise<SecureConnectionResult>;
  disconnect: () => Promise<void>;
  getDeviceInfo: (device?: Device) => DeviceInfo;
  checkConnection: () => Promise<boolean>;
  getCurrentConnection: () => SecureConnectionResult | undefined;
  isDeviceIdConnected: (deviceId: string) => Promise<
    | { isConnected: false }
    | {
        isConnected: true;
        device: Device;
        protocol: GentlyBLEProtocol;
        deviceInformation?: DeviceInformation;
      }
  >;

  // Custom key management (using serial number as identifier)
  getStoredCustomKey: (serialNumber: string) => Uint8Array | undefined;
  storeCustomKey: (serialNumber: string, customKey: Uint8Array) => void;
  clearCustomKey: (serialNumber: string) => void;
  getStoredKeysInfo: () => {
    serialNumber: string;
    keyLength: number;
    keyPreview: string;
  }[];
}

// Create the context
const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined,
);

// Global state for Bluetooth manager and keys (persists across component unmounts)
let globalBleManager: BleManager | null = null;
const globalCustomKeys = new Map<string, Uint8Array>(); // Key: serial number, Value: custom key
let globalScanStopFunction: (() => void) | null = null;
const globalScannedDevices = new Map<string, BluetoothDevice>(); // Key: serial number, Value: device
let globalDisconnectionSubscription: { remove: () => void } | null = null;
let globalIsInitialized = false;

// Bluetooth Context Provider Component
export function BluetoothProvider({ children }: { children: ReactNode }) {
  console.log("🔧 BluetoothProvider: Initializing global Bluetooth context...");

  // Local state that components can subscribe to
  const [state, setState] = useState<BluetoothState>({
    isScanning: false,
    connectedDevice: null,
    connectionStatus: "disconnected",
    lastError: null,
    protocol: null,
    deviceInformation: null,
  });

  const [isInitialized, setIsInitialized] = useState(globalIsInitialized);

  // Initialize Bluetooth manager once globally
  useEffect(() => {
    const initializeGlobalBluetooth = async () => {
      if (!globalBleManager) {
        console.log("🔧 BluetoothProvider: Creating global BLE manager...");
        try {
          globalBleManager = new BleManager();
          await initializeBluetooth(globalBleManager);
          globalIsInitialized = true;
          setIsInitialized(true);
          console.log("✅ BluetoothProvider: Global Bluetooth initialized");
        } catch (error) {
          console.error(
            "❌ BluetoothProvider: Failed to initialize Bluetooth:",
            error,
          );
          setState((prev) => ({
            ...prev,
            lastError:
              error instanceof Error
                ? error.message
                : "Bluetooth initialization failed",
          }));
        }
      } else {
        console.log("♻️ BluetoothProvider: Using existing global BLE manager");
        setIsInitialized(globalIsInitialized);
      }
    };

    void initializeGlobalBluetooth();
  }, []);

  // Custom key management functions (using serial number as identifier)
  const storeCustomKey = useCallback(
    (serialNumber: string, customKey: Uint8Array) => {
      console.log(
        `🔑 BluetoothProvider: Storing custom key for device serial: ${serialNumber}`,
      );
      globalCustomKeys.set(serialNumber, customKey);
    },
    [],
  );

  const getStoredCustomKey = useCallback(
    (serialNumber: string): Uint8Array | undefined => {
      const key = globalCustomKeys.get(serialNumber);
      if (key) {
        console.log(
          `🔑 BluetoothProvider: Found stored custom key for device serial: ${serialNumber}`,
        );
      } else {
        console.log(
          `🔍 BluetoothProvider: No stored custom key found for device serial: ${serialNumber}`,
        );
      }
      return key;
    },
    [],
  );

  const clearCustomKey = useCallback((serialNumber: string) => {
    console.log(
      `🗑️ BluetoothProvider: Clearing custom key for device serial: ${serialNumber}`,
    );
    globalCustomKeys.delete(serialNumber);
  }, []);

  const getStoredKeysInfo = useCallback(() => {
    const keys = Array.from(globalCustomKeys.entries()).map(
      ([serialNumber, key]) => ({
        serialNumber,
        keyLength: key.length,
        keyPreview:
          Array.from(key.slice(0, 4))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("") + "...",
      }),
    );
    console.log("🔑 BluetoothProvider: Stored custom keys:", keys);
    return keys;
  }, []);

  // Setup device disconnection monitoring
  // Note: Auto-reconnect is disabled to prevent connection loops.
  // When a device disconnects, the custom key is cleared and manual reconnection is required.
  // This ensures full protocol re-establishment for stable connections.
  const setupDisconnectionMonitoring = useCallback(
    (bluetoothDeviceId: string, serialNumber?: string) => {
      if (!globalBleManager) {
        console.warn(
          "⚠️ BluetoothProvider: Cannot setup disconnection monitoring: no BLE manager",
        );
        return;
      }

      console.log(
        `🔍 BluetoothProvider: Setting up disconnection monitoring for device: ${bluetoothDeviceId} (serial: ${serialNumber ?? "unknown"})`,
      );

      // Remove any existing subscription
      if (globalDisconnectionSubscription) {
        globalDisconnectionSubscription.remove();
        globalDisconnectionSubscription = null;
      }

      // Setup the disconnection listener
      const subscription = globalBleManager.onDeviceDisconnected(
        bluetoothDeviceId,
        (error, device) => {
          console.log(
            "🔌 BluetoothProvider: Device disconnection event triggered",
          );

          if (error) {
            console.error(
              "❌ BluetoothProvider: Disconnection error:",
              JSON.stringify(error, null, 2),
            );
          }

          if (device) {
            console.log("📱 BluetoothProvider: Disconnected device info:", {
              id: device.id,
              name: device.name,
              rssi: device.rssi,
            });

            // Update state to reflect disconnection
            setState((prev) => ({
              ...prev,
              connectedDevice: null,
              protocol: null,
              deviceInformation: null,
              connectionStatus: "disconnected",
              lastError: error ? `Disconnected: ${error.message}` : null,
            }));

            // Clear the stored custom key for this device when it disconnects
            // If we have the serial number, use it directly; otherwise try to find it from global map
            if (serialNumber) {
              clearCustomKey(serialNumber);
            } else {
              // Try to find the serial number by scanning the global device map
              for (const [
                sn,
                scannedDevice,
              ] of globalScannedDevices.entries()) {
                if (scannedDevice.id === device.id) {
                  clearCustomKey(sn);
                  console.log(
                    `🔍 BluetoothProvider: Found serial number ${sn} for disconnected device ${device.id}`,
                  );
                  break;
                }
              }
            }

            console.log(
              "� BluetoothProvider: Device disconnected, manual reconnection required",
            );
            console.log(
              "� BluetoothProvider: Use connect() method to re-establish full protocol",
            );

            // Note: Auto-reconnect is disabled to prevent loops
            // Full protocol re-establishment is required for stable connection
          }
        },
      );

      globalDisconnectionSubscription = subscription;
      console.log(
        "✅ BluetoothProvider: Disconnection monitoring setup completed",
      );
    },
    [clearCustomKey],
  );

  const removeDisconnectionMonitoring = useCallback(() => {
    if (globalDisconnectionSubscription) {
      console.log("🗑️ BluetoothProvider: Removing disconnection monitoring");
      globalDisconnectionSubscription.remove();
      globalDisconnectionSubscription = null;
    }
  }, []);

  // Get Bluetooth state
  const getBluetoothState = useCallback(async (): Promise<State> => {
    if (!globalBleManager) {
      throw new Error("Bluetooth manager not initialized");
    }
    return await globalBleManager.state();
  }, []);

  // Start device scan
  const startScan = useCallback(
    (options?: ScanOptions, callbacks?: ScanCallbacks): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!globalBleManager) {
          reject(new Error("Bluetooth manager not initialized"));
          return;
        }

        if (!isInitialized) {
          reject(
            new Error(
              "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
            ),
          );
          return;
        }

        console.log("🔍 BluetoothProvider: Starting device scan...");

        setState((prev) => ({ ...prev, isScanning: true, lastError: null }));

        try {
          // Create wrapped callbacks that store devices in global map
          const wrappedCallbacks: ScanCallbacks = {
            onDeviceFound: (device) => {
              console.log(`🔍 BluetoothProvider: 📡 Device found during scan:`);
              console.log(`🔍 BluetoothProvider: - Device ID: ${device.id}`);
              console.log(
                `🔍 BluetoothProvider: - Device name: ${device.name}`,
              );
              console.log(
                `🔍 BluetoothProvider: - Has advertisement data: ${!!device.advertisementData}`,
              );

              // Store the device in the global map using serial number as key
              if (device.advertisementData?.serialNumber) {
                console.log(
                  `🔍 BluetoothProvider: - Serial number from scan: ${Array.from(
                    device.advertisementData.serialNumber,
                  )
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")}`,
                );

                // Convert serial number from Uint8Array to hex string
                const serialNumber = Array.from(
                  device.advertisementData.serialNumber,
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")
                  .toUpperCase();

                globalScannedDevices.set(serialNumber, device);
                console.log(
                  `🗂️ BluetoothProvider: Stored device with serial ${serialNumber} (BLE ID: ${device.id}) in global map`,
                );

                // Verify device was stored with advertisement data
                const storedDevice = globalScannedDevices.get(serialNumber);
                console.log(
                  `🔍 BluetoothProvider: ✅ Verification - stored device has ad data: ${!!storedDevice?.advertisementData}`,
                );
                if (storedDevice?.advertisementData?.serialNumber) {
                  console.log(
                    `🔍 BluetoothProvider: ✅ Verification - stored device serial number: ${Array.from(
                      storedDevice.advertisementData.serialNumber,
                    )
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("")}`,
                  );
                }
              } else {
                console.warn(
                  `⚠️ BluetoothProvider: Device ${device.id} has no serial number in advertisement data, skipping global storage`,
                );
                console.log(
                  `🔍 BluetoothProvider: - Advertisement data keys:`,
                  device.advertisementData
                    ? Object.keys(device.advertisementData)
                    : "null/undefined",
                );
              }

              // Call the original callback if provided
              if (callbacks?.onDeviceFound) {
                callbacks.onDeviceFound(device);
              }
            },
            onError: (error) => {
              // Update BluetoothContext state when scan errors
              setState((prev) => ({
                ...prev,
                isScanning: false,
                lastError: error,
              }));
              globalScanStopFunction = null;
              console.log(
                "❌ BluetoothProvider: Scan error, updated state:",
                error,
              );

              // Call the original callback if provided
              if (callbacks?.onError) {
                callbacks.onError(error);
              }
            },
            onComplete: () => {
              // Update BluetoothContext state when scan completes
              setState((prev) => ({ ...prev, isScanning: false }));
              globalScanStopFunction = null;
              console.log(
                "✅ BluetoothProvider: Scan completed, updated state",
              );

              // Call the original callback if provided
              if (callbacks?.onComplete) {
                callbacks.onComplete();
              }
            },
          };

          const stopScanFn = startDeviceScan(
            globalBleManager,
            wrappedCallbacks,
            options ?? {},
          );

          globalScanStopFunction = stopScanFn;
          resolve();
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isScanning: false,
            lastError: error instanceof Error ? error.message : "Scan failed",
          }));
          reject(error instanceof Error ? error : new Error("Scan failed"));
        }
      });
    },
    [isInitialized],
  );

  // Stop device scan
  const stopScan = useCallback(() => {
    console.log("⏹️ BluetoothProvider: Stopping device scan...");

    // Stop via the scan stop function if available
    if (globalScanStopFunction) {
      console.log("🛑 BluetoothProvider: Using global scan stop function");
      globalScanStopFunction();
      globalScanStopFunction = null;
    }

    // Also directly stop via BLE manager as a fallback
    if (globalBleManager) {
      try {
        void globalBleManager.stopDeviceScan();
        console.log("🛑 BluetoothProvider: Stopped scan via BLE manager");
      } catch (error) {
        console.log(
          "⚠️ BluetoothProvider: BLE manager scan stop error (may already be stopped):",
          error,
        );
      }
    }

    // Update scanning state
    setState((prev) => ({ ...prev, isScanning: false }));
    console.log("✅ BluetoothProvider: Scan stop completed");
  }, []);

  // Check if a specific device ID is already connected
  const isDeviceIdConnected = useCallback(
    async (
      deviceId: string,
    ): Promise<
      | { isConnected: false }
      | {
          isConnected: true;
          device: Device;
          protocol: GentlyBLEProtocol;
          deviceInformation?: DeviceInformation;
        }
    > => {
      console.log(
        `🔍 BluetoothProvider: Checking if device ${deviceId} is already connected...`,
      );

      if (!state.connectedDevice || !state.protocol) {
        console.log("❌ BluetoothProvider: No connected device or protocol");
        return { isConnected: false };
      }

      // Check if the connected device ID matches the requested device ID
      if (state.connectedDevice.id !== deviceId) {
        console.log(
          `❌ BluetoothProvider: Connected device ID (${state.connectedDevice.id}) doesn't match requested ID (${deviceId})`,
        );
        return { isConnected: false };
      }

      try {
        // Verify the device is still actually connected
        const connected = await state.connectedDevice.isConnected();

        if (connected) {
          console.log(
            `✅ BluetoothProvider: Device ${deviceId} is already connected and verified`,
          );

          return {
            isConnected: true,
            device: state.connectedDevice,
            protocol: state.protocol,
            deviceInformation: state.deviceInformation ?? undefined,
          };
        } else {
          console.log(
            `❌ BluetoothProvider: Device ${deviceId} is no longer connected`,
          );
          // Clean up state since device is disconnected
          setState((prev) => ({
            ...prev,
            connectedDevice: null,
            protocol: null,
            deviceInformation: null,
            connectionStatus: "disconnected",
          }));
          return { isConnected: false };
        }
      } catch (error) {
        console.error(
          `❌ BluetoothProvider: Error checking device ${deviceId} connection:`,
          error,
        );
        // Clean up state on error
        setState((prev) => ({
          ...prev,
          connectedDevice: null,
          protocol: null,
          deviceInformation: null,
          connectionStatus: "disconnected",
        }));
        return { isConnected: false };
      }
    },
    [state.connectedDevice, state.protocol, state.deviceInformation],
  );

  // Connect to device by scanning first
  const connect = useCallback(
    async (deviceId: string): Promise<SecureConnectionResult> => {
      if (!globalBleManager) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log(`🔗 BluetoothProvider: Connecting to device: ${deviceId}`);

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // Check if device is already connected first
        const existingConnection = await isDeviceIdConnected(deviceId);
        if (existingConnection.isConnected) {
          console.log(
            `✅ BluetoothProvider: Device ${deviceId} is already connected, reusing connection`,
          );

          // Find the serial number for this device ID from our cache
          let serialNumber = "UNKNOWN";
          for (const [serialNum, device] of globalScannedDevices.entries()) {
            if (device.id === deviceId) {
              serialNumber = serialNum;
              break;
            }
          }

          return {
            device: existingConnection.device,
            protocol: existingConnection.protocol,
            deviceInfo: existingConnection.deviceInformation ?? {
              hardwareVersion: 1,
              firmwareVersionMajor: 1,
              firmwareVersionMinor: 0,
              firmwareBuildNumber: 1,
            },
            uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for existing connection
            serialNumber: serialNumber,
          };
        }

        // Get the stored device data including advertisement data
        // Since devices are stored by serial number, we need to find by device ID
        let scannedDevice: BluetoothDevice | undefined;
        for (const [serialNum, device] of globalScannedDevices.entries()) {
          if (device.id === deviceId) {
            scannedDevice = device;
            console.log(
              `🔍 BluetoothProvider: Found device ${deviceId} in cache with serial ${serialNum}`,
            );
            break;
          }
        }

        const advertisementData = scannedDevice?.advertisementData;

        console.log(
          `🔍 BluetoothProvider: 📋 Device lookup for ID ${deviceId}:`,
        );
        console.log(
          `🔍 BluetoothProvider: - Found in cache: ${!!scannedDevice}`,
        );
        console.log(
          `🔍 BluetoothProvider: - Has advertisement data: ${!!advertisementData}`,
        );
        if (advertisementData?.serialNumber) {
          console.log(
            `🔍 BluetoothProvider: - Serial number from ad data: ${Array.from(
              advertisementData.serialNumber,
            )
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")}`,
          );
        }

        // Get stored custom key if available
        const storedCustomKey = getStoredCustomKey(deviceId);

        console.log(
          "🔗 BluetoothProvider: Connecting with advertisement data:",
          advertisementData,
        );
        console.log(
          `🔑 BluetoothProvider: Using ${storedCustomKey ? "stored" : "new"} custom key for device ${deviceId}`,
        );

        const result = await connectToGentlyDevice(
          globalBleManager,
          deviceId,
          advertisementData,
          storedCustomKey, // Pass the stored custom key if available
        );

        // Store the custom key for future use if this was a new connection
        if (!storedCustomKey) {
          console.log(
            "🔑 BluetoothProvider: New connection established, storing dynamic key",
          );
          const dynamicKey = result.protocol.getDynamicKey();
          if (dynamicKey) {
            storeCustomKey(deviceId, dynamicKey);
            console.log(
              "✅ BluetoothProvider: Dynamic key stored for future connections",
            );
          } else {
            console.log(
              "⚠️ BluetoothProvider: No dynamic key available to store",
            );
          }
        }

        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

        // Setup disconnection monitoring for the connected device
        setupDisconnectionMonitoring(deviceId);

        return result;
      } catch (error) {
        console.error("❌ BluetoothProvider: Failed to connect:", error);
        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    [
      isInitialized,
      getStoredCustomKey,
      storeCustomKey,
      setupDisconnectionMonitoring,
      isDeviceIdConnected,
    ],
  );

  // Connect to device by device ID (stored from previous scan)
  const connectById = useCallback(
    async (deviceId: string): Promise<SecureConnectionResult> => {
      if (!globalBleManager) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log(
        `🔗 BluetoothProvider: Connecting to device with ID: ${deviceId}`,
      );

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // Check if device is already connected first
        const existingConnection = await isDeviceIdConnected(deviceId);
        if (existingConnection.isConnected) {
          console.log(
            `✅ BluetoothProvider: Device ${deviceId} is already connected, reusing connection`,
          );

          // Find the serial number for this device ID from our cache
          let serialNumber = "UNKNOWN";
          for (const [serialNum, device] of globalScannedDevices.entries()) {
            if (device.id === deviceId) {
              serialNumber = serialNum;
              break;
            }
          }

          return {
            device: existingConnection.device,
            protocol: existingConnection.protocol,
            deviceInfo: existingConnection.deviceInformation ?? {
              hardwareVersion: 1,
              firmwareVersionMajor: 1,
              firmwareVersionMinor: 0,
              firmwareBuildNumber: 1,
            },
            uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for existing connection
            serialNumber: serialNumber,
          };
        }

        // Get stored custom key if available
        const storedCustomKey = getStoredCustomKey(deviceId);

        console.log(
          `🔑 BluetoothProvider: Using ${storedCustomKey ? "stored" : "new"} custom key for device ${deviceId}`,
        );

        // Connect directly using the stored device ID
        const result = await connectToGentlyDevice(
          globalBleManager,
          deviceId,
          undefined, // No advertisement data available for direct connection
          storedCustomKey, // Pass the stored custom key if available
        );

        // Store the custom key for future use if this was a new connection
        if (!storedCustomKey) {
          console.log(
            "🔑 BluetoothProvider: New connection established, storing dynamic key",
          );
          const dynamicKey = result.protocol.getDynamicKey();
          if (dynamicKey) {
            storeCustomKey(deviceId, dynamicKey);
            console.log(
              "✅ BluetoothProvider: Dynamic key stored for future connections",
            );
          } else {
            console.log(
              "⚠️ BluetoothProvider: No dynamic key available to store",
            );
          }
        }

        console.log(
          `✅ BluetoothProvider: Successfully connected to device ${deviceId}`,
        );
        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

        // Note: Disconnection monitoring is handled by the connect() function to avoid duplicates
        // setupDisconnectionMonitoring(deviceId); // Removed to prevent duplicate subscriptions

        return result;
      } catch (error) {
        console.error(
          `❌ BluetoothProvider: Failed to connect to device ${deviceId}:`,
          error,
        );

        // Handle specific manager destroyed error
        if (error instanceof Error && error.message.includes("destroyed")) {
          setState((prev) => ({
            ...prev,
            connectionStatus: "error",
            lastError: "Bluetooth manager was destroyed",
          }));
          throw new Error("Bluetooth manager was destroyed");
        }

        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    [isInitialized, getStoredCustomKey, storeCustomKey, isDeviceIdConnected],
  );

  // Connect to device by serial number (scans first to find current Bluetooth device ID)
  const connectBySerialNumber = useCallback(
    async (serialNumber: string): Promise<SecureConnectionResult> => {
      if (!globalBleManager) {
        throw new Error("Bluetooth manager not initialized");
      }

      if (!isInitialized) {
        throw new Error(
          "Bluetooth not initialized. Please check permissions and enable Bluetooth.",
        );
      }

      console.log(
        `🔗 BluetoothProvider: Connecting to device with serial number: ${serialNumber}`,
      );

      setState((prev) => ({
        ...prev,
        connectionStatus: "connecting",
        lastError: null,
      }));

      try {
        // First, check if we have this device in our global map
        let device = globalScannedDevices.get(serialNumber);

        if (!device) {
          console.log(
            `🔍 BluetoothProvider: Device with serial ${serialNumber} not found in cache, scanning...`,
          );
        } else {
          console.log(
            `✅ BluetoothProvider: Found device with serial ${serialNumber} in cache, BLE ID: ${device.id}`,
          );
          console.log(`🔍 BluetoothProvider: 📋 Cached device verification:`);
          console.log(
            `🔍 BluetoothProvider: - Has advertisement data: ${!!device.advertisementData}`,
          );
          if (device.advertisementData) {
            console.log(
              `🔍 BluetoothProvider: - Advertisement data keys:`,
              Object.keys(device.advertisementData),
            );
            console.log(
              `🔍 BluetoothProvider: - Has serial number: ${!!device.advertisementData.serialNumber}`,
            );
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (device.advertisementData.serialNumber) {
              console.log(
                `🔍 BluetoothProvider: - Serial number: ${Array.from(
                  device.advertisementData.serialNumber,
                )
                  .map((b) => b.toString(16).padStart(2, "0"))
                  .join("")}`,
              );
            }
          } else {
            console.log(
              `🔍 BluetoothProvider: ⚠️  Cached device has no advertisement data!`,
            );
          }
        }

        if (!device) {
          console.log(
            `🔍 BluetoothProvider: Device with serial ${serialNumber} not found in cache, scanning...`,
          );

          // If not found, we need to scan to find the device
          let foundDevice: BluetoothDevice | undefined;
          let scanStopFunction: (() => void) | null = null;

          // Create a promise that resolves when we find the target device or timeout
          await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              if (scanStopFunction) {
                scanStopFunction();
              }
              if (!foundDevice) {
                reject(
                  new Error(
                    `Device with serial number ${serialNumber} not found during scan`,
                  ),
                );
              } else {
                resolve();
              }
            }, 10000); // 10 second scan timeout

            const scanPromise = startScan(
              { timeout: 10000 }, // 10 second scan timeout
              {
                onDeviceFound: (scannedDevice) => {
                  // Convert serial number to hex string for comparison
                  if (scannedDevice.advertisementData?.serialNumber) {
                    const scannedSerial = Array.from(
                      scannedDevice.advertisementData.serialNumber,
                    )
                      .map((b) => b.toString(16).padStart(2, "0"))
                      .join("")
                      .toUpperCase();

                    if (scannedSerial === serialNumber) {
                      foundDevice = scannedDevice;
                      console.log(
                        `✅ BluetoothProvider: Found device with serial ${serialNumber}, BLE ID: ${scannedDevice.id}`,
                      );
                      console.log(
                        `🔍 BluetoothProvider: 📡 Scanned device verification:`,
                      );
                      console.log(
                        `🔍 BluetoothProvider: - Has advertisement data: ${!!scannedDevice.advertisementData}`,
                      );
                      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                      if (scannedDevice.advertisementData?.serialNumber) {
                        console.log(
                          `🔍 BluetoothProvider: - Serial number: ${Array.from(
                            scannedDevice.advertisementData.serialNumber,
                          )
                            .map((b) => b.toString(16).padStart(2, "0"))
                            .join("")}`,
                        );
                      }

                      // Stop scanning immediately after finding the device
                      console.log(
                        `🛑 BluetoothProvider: Target device found, stopping scan early`,
                      );
                      clearTimeout(timeoutId);
                      if (scanStopFunction) {
                        scanStopFunction();
                      }
                      resolve();
                    }
                  }
                },
                onError: (error) => {
                  console.error(
                    `❌ BluetoothProvider: Scan error while looking for serial ${serialNumber}:`,
                    error,
                  );
                  clearTimeout(timeoutId);
                  reject(new Error(`Scan error: ${error}`));
                },
                onComplete: () => {
                  console.log(`✅ BluetoothProvider: Scan completed`);
                  clearTimeout(timeoutId);
                  if (!foundDevice) {
                    reject(
                      new Error(
                        `Device with serial number ${serialNumber} not found during scan`,
                      ),
                    );
                  } else {
                    resolve();
                  }
                },
              },
            );

            // Store the scan stop function to stop scanning when device is found
            scanPromise
              .then(() => {
                // The startScan method doesn't return a stop function directly,
                // so we'll use the global stop function
                scanStopFunction = () => {
                  stopScan();
                };
              })
              .catch((error) => {
                console.error(
                  "❌ BluetoothProvider: Error starting scan:",
                  error,
                );
                clearTimeout(timeoutId);
                reject(
                  error instanceof Error
                    ? error
                    : new Error(`Scan start failed: ${String(error)}`),
                );
              });
          });

          if (!foundDevice) {
            throw new Error(
              `Device with serial number ${serialNumber} not found during scan`,
            );
          }

          device = foundDevice;
        } else {
          console.log(
            `✅ BluetoothProvider: Found device with serial ${serialNumber} in cache, BLE ID: ${device.id}`,
          );
        }

        // Get stored custom key using serial number
        const storedCustomKey = getStoredCustomKey(serialNumber);
        console.log(
          `🔑 BluetoothProvider: Using ${storedCustomKey ? "stored" : "new"} custom key for serial ${serialNumber}`,
        );

        // Now connect using the device's current Bluetooth ID
        console.log(`🔍 BluetoothProvider: About to connect with device:`, {
          id: device.id,
          hasAdvertisementData: !!device.advertisementData,
          serialNumberFromAd: device.advertisementData?.serialNumber
            ? Array.from(device.advertisementData.serialNumber)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
            : "NOT AVAILABLE",
        });

        console.log(
          `🔍 BluetoothProvider: 🚀 About to call connectToGentlyDevice with:`,
        );
        console.log(`🔍 BluetoothProvider: - Device ID: ${device.id}`);
        console.log(
          `🔍 BluetoothProvider: - Advertisement data exists: ${!!device.advertisementData}`,
        );
        if (device.advertisementData) {
          console.log(
            `🔍 BluetoothProvider: - Advertisement data keys:`,
            Object.keys(device.advertisementData),
          );
          console.log(
            `🔍 BluetoothProvider: - Serial number exists in ad data: ${!!device.advertisementData.serialNumber}`,
          );
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (device.advertisementData.serialNumber) {
            console.log(
              `🔍 BluetoothProvider: - Serial number from ad data: ${Array.from(
                device.advertisementData.serialNumber,
              )
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")}`,
            );
          }
        } else {
          console.log(
            `🔍 BluetoothProvider: ⚠️  Advertisement data is null/undefined - this will cause all-zero serial number!`,
          );
        }

        const result = await connectToGentlyDevice(
          globalBleManager,
          device.id,
          device.advertisementData,
          storedCustomKey,
        );

        // Store the custom key for future use if this was a new connection
        if (!storedCustomKey) {
          console.log(
            "🔑 BluetoothProvider: New connection established, storing dynamic key",
          );
          const dynamicKey = result.protocol.getDynamicKey();
          if (dynamicKey) {
            storeCustomKey(serialNumber, dynamicKey);
            console.log(
              "✅ BluetoothProvider: Dynamic key stored for future connections",
            );
          } else {
            console.log(
              "⚠️ BluetoothProvider: No dynamic key available to store",
            );
          }
        }

        setState((prev) => ({
          ...prev,
          connectedDevice: result.device,
          protocol: result.protocol,
          deviceInformation: result.deviceInfo,
          connectionStatus: "connected",
        }));

        // Setup disconnection monitoring with both Bluetooth ID and serial number
        setupDisconnectionMonitoring(result.device.id, serialNumber);

        return result;
      } catch (error) {
        console.error(
          `❌ BluetoothProvider: Failed to connect to device with serial ${serialNumber}:`,
          error,
        );
        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
        throw error;
      }
    },
    [
      isInitialized,
      getStoredCustomKey,
      storeCustomKey,
      setupDisconnectionMonitoring,
      startScan,
      stopScan,
    ],
  );

  // Disconnect from device
  const disconnect = useCallback(async (): Promise<void> => {
    if (!state.connectedDevice) {
      return;
    }

    const deviceId = state.connectedDevice.id;

    try {
      await state.connectedDevice.cancelConnection();

      // Remove disconnection monitoring since we're intentionally disconnecting
      removeDisconnectionMonitoring();

      // Clear the stored custom key for this device when manually disconnecting
      clearCustomKey(deviceId);

      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        protocol: null,
        deviceInformation: null,
        connectionStatus: "disconnected",
      }));
    } catch (error) {
      console.error("❌ BluetoothProvider: Failed to disconnect:", error);
      setState((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : "Unknown error",
      }));
      throw error;
    }
  }, [state.connectedDevice, removeDisconnectionMonitoring, clearCustomKey]);

  // Get device info using stored device information
  const getDeviceInfo = useCallback(
    (device?: Device): DeviceInfo => {
      const targetDevice = device ?? state.connectedDevice;
      const deviceInfo = state.deviceInformation;

      if (!targetDevice) {
        console.log(
          "⚠️ BluetoothProvider: No device provided for getDeviceInfo",
        );
        return {
          serialNumber: "Unknown",
          firmwareVersion: "Unknown",
          batteryLevel: 0,
        };
      }

      // For now, using mock data since DeviceInformation doesn't have all fields
      return {
        serialNumber: deviceInfo
          ? `GNT-${deviceInfo.hardwareVersion}-${deviceInfo.firmwareBuildNumber}`
          : "Unknown",
        firmwareVersion: deviceInfo
          ? `${deviceInfo.firmwareVersionMajor}.${deviceInfo.firmwareVersionMinor}.${deviceInfo.firmwareBuildNumber}`
          : "Unknown",
        batteryLevel: 85, // Mock battery level
      };
    },
    [state.connectedDevice, state.deviceInformation],
  );

  // Check connection status
  const checkConnection = useCallback(async (): Promise<boolean> => {
    console.log("🔍 BluetoothProvider: Checking connection status...");

    if (!state.connectedDevice) {
      console.log("❌ BluetoothProvider: No connected device");
      return false;
    }

    try {
      console.log("🔍 BluetoothProvider: Checking device connection status...");
      const connected = await state.connectedDevice.isConnected();

      console.log("🔍 BluetoothProvider: Connection status:", connected);

      if (!connected) {
        console.log(
          "❌ BluetoothProvider: Device is no longer connected, updating state",
        );
        setState((prev) => ({
          ...prev,
          connectedDevice: null,
          protocol: null,
          deviceInformation: null,
          connectionStatus: "disconnected",
        }));
      }
      return connected;
    } catch (error) {
      console.error("❌ BluetoothProvider: Error checking connection:", error);
      setState((prev) => ({
        ...prev,
        connectedDevice: null,
        protocol: null,
        deviceInformation: null,
        connectionStatus: "disconnected",
      }));
      return false;
    }
  }, [state.connectedDevice]);

  // Get current connection as SecureConnectionResult if available
  const getCurrentConnection = useCallback(():
    | SecureConnectionResult
    | undefined => {
    if (!state.connectedDevice || !state.protocol || !state.deviceInformation) {
      return undefined;
    }

    console.log(
      "✅ BluetoothProvider: Returning current connection for command reuse",
    );

    // Find the serial number for the current connected device from our cache
    let serialNumber = "UNKNOWN";
    for (const [serialNum, device] of globalScannedDevices.entries()) {
      if (device.id === state.connectedDevice.id) {
        serialNumber = serialNum;
        break;
      }
    }

    return {
      device: state.connectedDevice,
      protocol: state.protocol,
      deviceInfo: state.deviceInformation,
      uptime: new Uint8Array([0, 0, 0, 0]), // Mock uptime for reused connection
      serialNumber: serialNumber,
    };
  }, [state.connectedDevice, state.protocol, state.deviceInformation]);

  // Context value
  const contextValue: BluetoothContextType = {
    // State
    ...state,
    isInitialized,

    // Actions
    getBluetoothState,
    startScan,
    stopScan,
    connect,
    connectById,
    connectBySerialNumber,
    disconnect,
    getDeviceInfo,
    checkConnection,
    getCurrentConnection,
    isDeviceIdConnected,

    // Custom key management
    getStoredCustomKey,
    storeCustomKey,
    clearCustomKey,
    getStoredKeysInfo,
  };

  return (
    <BluetoothContext.Provider value={contextValue}>
      {children}
    </BluetoothContext.Provider>
  );
}

// Hook to use the Bluetooth context
export function useBluetoothContext(): BluetoothContextType {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error(
      "useBluetoothContext must be used within a BluetoothProvider",
    );
  }
  return context;
}
