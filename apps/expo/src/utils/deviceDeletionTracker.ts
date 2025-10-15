/**
 * Global tracker for devices being deleted
 * This prevents auto-connect from triggering during deletion
 */
export const devicesBeingDeleted = new Set<string>();
