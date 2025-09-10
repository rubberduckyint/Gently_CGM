// Bluetooth permissions and initialization
import type { BleManager } from "react-native-ble-plx";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { State } from "react-native-ble-plx";
import * as Location from "expo-location";

console.log("📁 FILE LOADED: permissions.ts imported and ready");

/**
 * Request all necessary permissions for Bluetooth operations
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  console.log("🔐 ENTER: requestBluetoothPermissions function called");
  console.log("🔐 Platform.OS:", Platform.OS);
  console.log("🔐 Platform.Version:", Platform.Version);

  try {
    if (Platform.OS === "android") {
      console.log("📱 ANDROID: Starting Android permission flow...");

      // Check current location permission status first
      const currentStatus = await Location.getForegroundPermissionsAsync();
      console.log("📍 CURRENT location permission status:", currentStatus);

      // Only request if not already granted
      if (currentStatus.status !== Location.PermissionStatus.GRANTED) {
        // Request location permission (required for BLE scanning on Android)
        console.log("📍 REQUESTING location permission...");

        try {
          // Add timeout to prevent hanging
          const locationPromise = Location.requestForegroundPermissionsAsync();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Location permission request timeout after 10 seconds",
                  ),
                ),
              10000,
            ),
          );

          const locationResult = await Promise.race([
            locationPromise,
            timeoutPromise,
          ]);
          const { status: locationStatus } = locationResult;

          console.log("📍 RESULT location permission status:", locationStatus);
          console.log(
            "📍 Expected GRANTED value:",
            Location.PermissionStatus.GRANTED,
          );
          console.log(
            "📍 Status comparison result:",
            locationStatus === Location.PermissionStatus.GRANTED,
          );

          if (locationStatus !== Location.PermissionStatus.GRANTED) {
            console.log("❌ FAILED: Location permission denied");
            Alert.alert(
              "Location Permission Required",
              "Location permission is required to scan for Bluetooth devices on Android.",
            );
            return false;
          }

          console.log("✅ SUCCESS: Location permission granted");
        } catch (error) {
          console.error(
            "❌ EXCEPTION during location permission request:",
            error,
          );
          console.error(
            "❌ This might be a timeout or permission dialog issue",
          );
          Alert.alert(
            "Permission Error",
            "Failed to request location permission. Please try again or enable it manually in settings.",
          );
          return false;
        }
      } else {
        console.log("✅ SKIP: Location permission already granted");
      }

      // Request Bluetooth permissions for Android 12+
      const androidVersion =
        typeof Platform.Version === "string"
          ? parseInt(Platform.Version)
          : Platform.Version;
      if (androidVersion >= 31) {
        console.log(
          "📱 ANDROID 12+: Requesting additional Bluetooth permissions...",
        );

        const bluetoothPermissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        console.log("🔐 REQUESTING permissions:", bluetoothPermissions);

        const bluetoothResult =
          await PermissionsAndroid.requestMultiple(bluetoothPermissions);

        console.log("🔐 RESULT Bluetooth permissions:", bluetoothResult);

        // Check if all permissions were granted
        const allGranted = bluetoothPermissions.every(
          (permission) =>
            bluetoothResult[permission] === PermissionsAndroid.RESULTS.GRANTED,
        );

        console.log("🔐 All Bluetooth permissions granted:", allGranted);

        if (!allGranted) {
          console.log("❌ FAILED: Not all Bluetooth permissions granted");
          const deniedPermissions = bluetoothPermissions.filter(
            (permission) =>
              bluetoothResult[permission] !==
              PermissionsAndroid.RESULTS.GRANTED,
          );
          console.log("❌ Denied permissions:", deniedPermissions);

          Alert.alert(
            "Bluetooth Permissions Required",
            "Bluetooth permissions are required to scan for and connect to devices.",
          );
          return false;
        }

        console.log("✅ SUCCESS: All Bluetooth permissions granted");
      } else {
        console.log(
          "📱 ANDROID <12: Skipping additional Bluetooth permissions",
        );
      }

      console.log("✅ FINAL: All Android permissions granted");
      return true;
    } else {
      // iOS - permissions are handled automatically
      console.log("🍎 iOS: Bluetooth permissions handled automatically");
      return true;
    }
  } catch (error) {
    console.error("❌ EXCEPTION in requestBluetoothPermissions:", error);
    console.error("❌ ERROR type:", typeof error);
    console.error(
      "❌ ERROR message:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.error(
      "❌ ERROR stack:",
      error instanceof Error ? error.stack : "No stack",
    );

    Alert.alert(
      "Permission Error",
      "Failed to request Bluetooth permissions. Please check your device settings.",
    );
    return false;
  }
}

/**
 * Initialize Bluetooth and check if it's ready
 */
export async function initializeBluetooth(
  manager: BleManager,
): Promise<boolean> {
  console.log("🔵 ENTER: initializeBluetooth function called");
  console.log("🔵 Manager provided:", !!manager);

  try {
    // Request permissions
    console.log("🔐 CALLING: requestBluetoothPermissions...");
    const hasPermissions = await requestBluetoothPermissions();

    console.log(
      "🔐 RESULT: requestBluetoothPermissions returned:",
      hasPermissions,
    );

    if (!hasPermissions) {
      console.log("❌ FAILED: Bluetooth permissions not granted");
      throw new Error("Bluetooth permissions not granted");
    }

    console.log(
      "✅ SUCCESS: Bluetooth permissions granted, checking Bluetooth state...",
    );

    // Check if Bluetooth is enabled
    console.log("📡 CALLING: manager.state()...");
    const state = await manager.state();
    console.log("📡 RESULT: Bluetooth state:", state);
    console.log("📡 Expected PoweredOn value:", State.PoweredOn);
    console.log("📡 State comparison:", state === State.PoweredOn);

    if (state !== State.PoweredOn) {
      const errorMsg = `Bluetooth is not enabled. Current state: ${state}. Please enable Bluetooth and try again.`;
      console.log("❌ FAILED:", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("✅ FINAL SUCCESS: Bluetooth is ready and powered on!");
    return true;
  } catch (error) {
    console.error("❌ EXCEPTION: Failed to initialize Bluetooth:", error);
    console.error("❌ ERROR type:", typeof error);
    console.error(
      "❌ ERROR message:",
      error instanceof Error ? error.message : "Unknown error",
    );
    console.error(
      "❌ ERROR stack:",
      error instanceof Error ? error.stack : "No stack",
    );
    return false;
  }
}
