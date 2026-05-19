import type { TelemetryChannel, TelemetrySeverity, StickyValue } from "../types";

// Safety cap for the bridge buffer to prevent memory leaks when UI is not draining
export const BRIDGE_BUFFER_CAP = 5000;

/**
 * Shared mutable buffer that the game engine writes to at full speed.
 * The React store drains it on each animation frame via syncFromBridge.
 */
export const TelemetryBridge = {
    sticky: {} as Record<string, StickyValue>,
    stickyDirty: false,

    logQueue: [] as Array<{
        channel: TelemetryChannel;
        message: string;
        severity: TelemetrySeverity;
        timestamp: number;
    }>,
};
