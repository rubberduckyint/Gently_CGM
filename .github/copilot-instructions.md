# Gently App

## Overview

The Gently app is designed to work with Gently devices, providing a seamless user experience for managing and interacting with these devices. A gently device is a bracelet that you can set alarms on to remind you to take medication or perform other tasks etc.

## Development Workflow

After completing any work, always run the following commands to ensure code quality:

1. **Type Check**: `pnpm typecheck 2>&1 | head -100` - Verify TypeScript types across all packages
2. **Lint**: `pnpm lint 2>&1 | head -100` - Check for code quality issues and enforce coding standards
3. **Format**: `pnpm format 2>&1 | head -100` - Auto-format code with Prettier for consistent style

These checks should be run from the workspace root and must pass before considering work complete. Always pipe output through `head` to avoid alternate buffer mode and ensure results are readable.

## Expo App

- The expo app should always use the global styling when styling the pages.
- All the pages should not use the expo navigation bar and make their own and be consistent.
- The ble_protocol.md file should be used to understand how the commands work to interact with the bracelet device.
