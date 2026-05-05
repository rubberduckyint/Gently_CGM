/**
 * Shared Types for Expo App
 *
 * This module centralizes all type definitions used throughout the app.
 * Types are inferred from the tRPC API router to ensure consistency
 * between frontend and backend.
 */

import type { RouterOutputs } from "~/utils/api";

// Infer database types from the API router outputs
export type Device = RouterOutputs["device"]["getById"];

/**
 * BLE device connection information
 */
export interface BLEDeviceInfo {
  id: string;
  name?: string;
  serialNumber?: string;
  rssi?: number;
}

/**
 * BLE connection states
 */
export type BLEConnectionState =
  | "disconnected"
  | "scanning"
  | "connecting"
  | "connected"
  | "error";
