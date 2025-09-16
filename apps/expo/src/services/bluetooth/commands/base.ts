/**
 * Base BLE Command Architecture
 *
 * This module defines the foundation for all BLE commands, providing:
 * - Standardized command interface and execution
 * - Response parsing and validation
 * - Error handling and logging
 * - Metadata and documentation
 * - Reusable command logic throughout the app
 */

import type { SecureConnectionResult } from "../connection";

/**
 * Status of a BLE command execution
 */
export enum BLECommandStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCESS = "success",
  ERROR = "error",
  CANCELLED = "cancelled",
}

/**
 * Severity level for command results
 */
export enum BLECommandSeverity {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
}

/**
 * Result of a BLE command execution
 */
export interface BLECommandResult<TData = unknown> {
  status: BLECommandStatus;
  severity: BLECommandSeverity;
  message: string;
  data?: TData;
  duration?: number; // Execution time in milliseconds
  timestamp: Date;
  logs: BLECommandLog[];
}

/**
 * Log entry for BLE command execution
 */
export interface BLECommandLog {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

/**
 * Metadata describing a BLE command
 */
export interface BLECommandMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  requiresConnection: boolean;
  estimatedDuration?: number; // milliseconds
  parameters?: BLECommandParameter[];
}

/**
 * Parameter definition for a BLE command
 */
export interface BLECommandParameter {
  name: string;
  type: "string" | "number" | "boolean" | "bytes";
  required: boolean;
  description: string;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}

/**
 * Context for command execution
 */
export interface BLECommandExecutionContext {
  deviceSerialNumber: string;
  connection?: SecureConnectionResult;
  connect: () => Promise<SecureConnectionResult>;
  disconnect: () => Promise<void>;
  parameters?: Record<string, unknown>;
  options?: {
    timeout?: number;
    captureConsoleLogs?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error";
  };
}

/**
 * Base class for all BLE commands
 */
export abstract class BLECommand<
  TData = unknown,
  _TParams = Record<string, unknown>,
> {
  protected readonly logs: BLECommandLog[] = [];
  protected startTime?: number;
  protected originalConsole?: {
    log: typeof console.log;
    error: typeof console.error;
    warn: typeof console.warn;
    debug: typeof console.debug;
  };

  /**
   * Command metadata - must be implemented by subclasses
   */
  public abstract readonly metadata: BLECommandMetadata;

  /**
   * Execute the command
   */
  public async execute(
    context: BLECommandExecutionContext,
  ): Promise<BLECommandResult<TData>> {
    this.startTime = Date.now();
    this.logs.length = 0; // Clear previous logs

    try {
      // Set up console log capture if requested
      if (context.options?.captureConsoleLogs) {
        this.setupConsoleCapture(context.options.logLevel ?? "info");
      }

      this.log("info", `Starting command: ${this.metadata.name}`);

      // Validate parameters
      if (this.metadata.parameters) {
        this.validateParameters(context.parameters ?? {});
      }

      // Execute the command
      const data = await this.executeImpl(context);

      const duration = Date.now() - this.startTime;
      this.log("info", `Command completed successfully in ${duration}ms`);

      return {
        status: BLECommandStatus.SUCCESS,
        severity: BLECommandSeverity.SUCCESS,
        message: `${this.metadata.name} completed successfully`,
        data,
        duration,
        timestamp: new Date(),
        logs: [...this.logs],
      };
    } catch (error) {
      const duration = this.startTime ? Date.now() - this.startTime : 0;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.log("error", `Command failed: ${errorMessage}`, error);

      return {
        status: BLECommandStatus.ERROR,
        severity: BLECommandSeverity.ERROR,
        message: `${this.metadata.name} failed: ${errorMessage}`,
        duration,
        timestamp: new Date(),
        logs: [...this.logs],
      };
    } finally {
      // Restore console if it was captured
      if (this.originalConsole) {
        this.restoreConsole();
      }
    }
  }

  /**
   * Implementation method - must be overridden by subclasses
   */
  protected abstract executeImpl(
    context: BLECommandExecutionContext,
  ): Promise<TData>;

  /**
   * Log a message with timestamp
   */
  protected log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    data?: unknown,
  ): void {
    const logEntry: BLECommandLog = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // Also log to console if not captured
    if (!this.originalConsole) {
      const timestamp = logEntry.timestamp.toLocaleTimeString();
      const formattedMessage = `[${timestamp}] ${message}`;

      switch (level) {
        case "debug":
          console.debug(formattedMessage, data ?? "");
          break;
        case "info":
          console.log(formattedMessage, data ?? "");
          break;
        case "warn":
          console.warn(formattedMessage, data ?? "");
          break;
        case "error":
          console.error(formattedMessage, data ?? "");
          break;
      }
    }
  }

  /**
   * Validate command parameters
   */
  protected validateParameters(parameters: Record<string, unknown>): void {
    if (!this.metadata.parameters) return;

    for (const param of this.metadata.parameters) {
      const value = parameters[param.name];

      // Check required parameters
      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      // Skip validation if parameter is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      if (!this.validateParameterType(value, param.type)) {
        throw new Error(
          `Parameter '${param.name}' must be of type ${param.type}`,
        );
      }

      // Additional validation rules
      if (param.validation) {
        this.validateParameterRules(param.name, value, param.validation);
      }
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case "string":
        return typeof value === "string";
      case "number":
        return typeof value === "number" && !isNaN(value);
      case "boolean":
        return typeof value === "boolean";
      case "bytes":
        return value instanceof Uint8Array;
      default:
        return true;
    }
  }

  /**
   * Validate parameter rules
   */
  private validateParameterRules(
    name: string,
    value: unknown,
    rules: NonNullable<BLECommandParameter["validation"]>,
  ): void {
    if (
      rules.min !== undefined &&
      typeof value === "number" &&
      value < rules.min
    ) {
      throw new Error(`Parameter '${name}' must be at least ${rules.min}`);
    }

    if (
      rules.max !== undefined &&
      typeof value === "number" &&
      value > rules.max
    ) {
      throw new Error(`Parameter '${name}' must be at most ${rules.max}`);
    }

    if (
      rules.pattern &&
      typeof value === "string" &&
      !new RegExp(rules.pattern).test(value)
    ) {
      throw new Error(`Parameter '${name}' does not match required pattern`);
    }

    if (rules.enum && !rules.enum.includes(value)) {
      throw new Error(
        `Parameter '${name}' must be one of: ${rules.enum.join(", ")}`,
      );
    }
  }

  /**
   * Set up console log capture
   */
  private setupConsoleCapture(
    minLevel: "debug" | "info" | "warn" | "error",
  ): void {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      debug: console.debug,
    };

    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3 };
    const minPriority = levelPriority[minLevel];

    console.log = (...args) => {
      if (levelPriority.info >= minPriority) {
        this.log("info", args.join(" "));
      }
      this.originalConsole?.log(...args);
    };

    console.error = (...args) => {
      if (levelPriority.error >= minPriority) {
        this.log("error", args.join(" "));
      }
      this.originalConsole?.error(...args);
    };

    console.warn = (...args) => {
      if (levelPriority.warn >= minPriority) {
        this.log("warn", args.join(" "));
      }
      this.originalConsole?.warn(...args);
    };

    console.debug = (...args) => {
      if (levelPriority.debug >= minPriority) {
        this.log("debug", args.join(" "));
      }
      this.originalConsole?.debug(...args);
    };
  }

  /**
   * Restore original console methods
   */
  private restoreConsole(): void {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.error = this.originalConsole.error;
      console.warn = this.originalConsole.warn;
      console.debug = this.originalConsole.debug;
      this.originalConsole = undefined;
    }
  }
}

/**
 * Utility function to create a simple command without subclassing
 */
export function createSimpleCommand<TData = unknown>(
  metadata: BLECommandMetadata,
  implementation: (context: BLECommandExecutionContext) => Promise<TData>,
): BLECommand<TData> {
  return new (class extends BLECommand<TData> {
    public readonly metadata = metadata;
    protected async executeImpl(
      context: BLECommandExecutionContext,
    ): Promise<TData> {
      return await implementation(context);
    }
  })();
}
