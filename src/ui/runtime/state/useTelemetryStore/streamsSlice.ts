import { nanoid } from "nanoid";
import type {
    TelemetryChannel,
    TelemetrySeverity,
    TelemetryLogEntry,
} from "../types";

export const MAX_ENTRIES_PER_CHANNEL = 2000; // hard cap per channel
export const KEEP_WINDOW_MS: number | null = null; // e.g. 60_000 for last 60s; null disables

// Extend the log entry shape non-breakingly (UI can ignore these fields)
export type CoalescedTelemetryLogEntry = TelemetryLogEntry & {
    count?: number;
    lastTimestamp?: number;
};

export const createEmptyStreams = (): Record<
    TelemetryChannel,
    CoalescedTelemetryLogEntry[]
> => ({
    tick: [],
    systems: [],
    errors: [],
});

export function appendWithCoalesceAndCap(
    arr: CoalescedTelemetryLogEntry[],
    next: { message: string; severity: TelemetrySeverity; timestamp: number },
): CoalescedTelemetryLogEntry[] {
    // Coalesce consecutive duplicates (same message + severity)
    const last = arr.at(-1);
    if (
        last &&
        last.message === next.message &&
        last.severity === next.severity
    ) {
        // Mutate a copy for immutability friendliness
        const out = arr.slice();
        const updated: CoalescedTelemetryLogEntry = {
            ...last,
            count: (last.count ?? 1) + 1,
            lastTimestamp: next.timestamp,
        };
        out[out.length - 1] = updated;
        return out;
    }

    // Append new row
    const out = arr.concat([
        {
            id: nanoid(),
            timestamp: next.timestamp,
            message: next.message,
            severity: next.severity,
            count: 1,
            lastTimestamp: next.timestamp,
        },
    ]);

    // Time-window pruning (optional)
    if (KEEP_WINDOW_MS != null) {
        const cutoff = Date.now() - KEEP_WINDOW_MS;
        let i = 0;
        while (i < out.length) {
            const ts = out[i].lastTimestamp ?? out[i].timestamp;
            if (ts >= cutoff) break;
            i++;
        }
        if (i > 0) return out.slice(i);
    }

    // Hard cap pruning
    if (out.length > MAX_ENTRIES_PER_CHANNEL) {
        return out.slice(out.length - MAX_ENTRIES_PER_CHANNEL);
    }

    return out;
}
