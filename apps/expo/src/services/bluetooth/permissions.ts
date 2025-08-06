// Bluetooth permissions and initialization
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { BleManager, State } from "react-native-ble-plx";
import * as Location from "expo-location";

/**
 * Request all necessary permissions for Bluetooth operations
 */
export async function requestBluetoothPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      // Request location permission (required for BLE scanning on Android)
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Location permission is required to scan for Bluetooth devices on Android.",
        );
        return false;
      }

      // Request Bluetooth permissions for Android 12+
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allPermissionsGranted = Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED,
        );

        if (!allPermissionsGranted) {
          Alert.alert(
            "Bluetooth Permissions Required",
            "Bluetooth permissions are required to connect to your Gently device.",
          );
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

/**
 * Initialize Bluetooth and check if it's ready
 */
export async function initializeBluetooth(
  manager: BleManager,
): Promise<boolean> {
  try {
    // Request permissions
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      throw new Error("Bluetooth permissions not granted");
    }

    // Check if Bluetooth is enabled
    const state = await manager.state();
    if (state !== State.PoweredOn) {
      throw new Error(
        "Bluetooth is not enabled. Please enable Bluetooth and try again.",
      );
    }

    return true;
  } catch (error) {
    console.error("Failed to initialize Bluetooth:", error);
    return false;
  }
}
