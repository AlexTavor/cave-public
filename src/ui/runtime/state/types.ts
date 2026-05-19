export const TELEMETRY_TABS = ["runtime", "tick", "systems", "errors"] as const;

export type TelemetryTab = (typeof TELEMETRY_TABS)[number];
export type TelemetryChannel = Exclude<TelemetryTab, "runtime">;
export type TelemetrySeverity = "info" | "warn" | "error";
export type StickyValue = string | number;

export interface TelemetryLogEntry {
    id: string;
    timestamp: number;
    message: string;
    severity: TelemetrySeverity;
}

export const isTelemetryTab = (value: string): value is TelemetryTab =>
    TELEMETRY_TABS.includes(value as TelemetryTab);

export const isTelemetryChannel = (value: string): value is TelemetryChannel =>
    value === "tick" || value === "systems" || value === "errors";
