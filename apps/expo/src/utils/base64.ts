// Base64 utilities for React Native
// These replace Buffer operations with React Native-compatible alternatives

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    const byte = uint8Array[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const uint8Array = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  return uint8Array;
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 */
export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert Uint8Array to string (UTF-8 decoding)
 */
export function uint8ArrayToString(uint8Array: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(uint8Array);
}
