import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { LOGIC_STEP_MS } from "../../../../../engine/runtime/runtimeConstants";

type DurationUnit = "s" | "m" | "h";

const compactLabelFormatter = new Intl.NumberFormat("en-US", {
    minimumSignificantDigits: 2,
    maximumSignificantDigits: 2,
    useGrouping: false,
});

const formatCompactLabelNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);
    if (abs === 0) return "0";
    let suffix: [number, string] | null = null;
    if (abs >= 1_000_000_000) suffix = [1_000_000_000, "b"];
    else if (abs >= 1_000_000) suffix = [1_000_000, "m"];
    else if (abs >= 1_000) suffix = [1_000, "k"];
    return `${sign}${compactLabelFormatter.format(
        suffix ? abs / suffix[0] : abs,
    )}${suffix?.[1] ?? ""}`;
};

export const normalizePath = (path: string) =>
    path.startsWith("self.") ? path.slice(5) : path;

export const readNumericValue = (
    entity: RuntimeEntity,
    path?: string,
): number | null => {
    if (!path) return null;
    let current: any = entity;
    for (const part of normalizePath(path).split(".")) {
        if (current == null) return null;
        current = current[part];
    }
    if (typeof current === "number" && Number.isFinite(current)) return current;
    return null;
};

export const resolveBarValuePath = (path: string) => {
    const normalized = normalizePath(path);
    return normalized.startsWith("state.") ? `${normalized}.value` : normalized;
};

export const formatCompactFraction = (current: number, max: number) =>
    `${formatCompactLabelNumber(current)}/${formatCompactLabelNumber(max)}`;

export const formatWholeFraction = (current: number, max: number) =>
    `${Math.round(current)}/${Math.round(max)}`;

export const formatEffectAmount = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? `${rounded}` : rounded.toString();
};

const formatUnit = (value: number, unit: DurationUnit) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded)
        ? `${rounded} ${unit}`
        : `${rounded.toFixed(1)} ${unit}`;
};

export const formatDurationMs = (ms: number | null) => {
    if (ms === null || !Number.isFinite(ms)) return null;
    const safeMs = Math.max(0, ms);
    if (safeMs < 1000) return `<1s`;
    if (safeMs < 60_000) return formatUnit(safeMs / 1000, "s");
    if (safeMs < 3_600_000) return formatUnit(safeMs / 60_000, "m");
    return formatUnit(safeMs / 3_600_000, "h");
};

export const formatCountdownText = (ticksRemaining: number | null) => {
    if (ticksRemaining === null || !Number.isFinite(ticksRemaining))
        return null;
    return formatDurationMs(ticksRemaining * LOGIC_STEP_MS);
};

export const resolveStateResourceKey = (path: string) => {
    const match = /^state\.([^.]+)(?:\.(?:value|max))?$/.exec(
        normalizePath(path),
    );
    return match?.[1] ?? null;
};
