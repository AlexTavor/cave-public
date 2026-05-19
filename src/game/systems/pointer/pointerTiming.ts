export const POINTER_PICKUP_STARTED_AT_MS = "pointer_pickup_started_at_ms";
export const POINTER_DROP_STARTED_AT_MS = "pointer_drop_started_at_ms";
export const POINTER_PICKUP_LAST_AT_MS = "pointer_pickup_last_at_ms";

export const resolvePointerElapsedMs = (
    active: boolean,
    startedAtMs: number,
    nowMs: number,
) => (active && startedAtMs > 0 ? Math.max(0, nowMs - startedAtMs) : 0);

export const resolvePointerPickupTimerMs = (
    active: boolean,
    startedAtMs: number,
    lastPickupAtMs: number,
    nowMs: number,
) => {
    if (active) {
        return Math.max(0, nowMs - Math.max(startedAtMs, lastPickupAtMs));
    }
    return 0;
};
