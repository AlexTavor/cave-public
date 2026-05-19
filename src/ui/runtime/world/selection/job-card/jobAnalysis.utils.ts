import type { RuntimeEntity } from "../../../../../engine/runtime/types";

const PROGRESS_DT = 16;

export const normalizeKey = (path: string) =>
    (path.startsWith("self.") ? path.slice(5) : path).replace(/\.value$/, "");

export const resolveNumber = (
    entity: RuntimeEntity,
    path?: string,
): number | null => {
    if (!path) return null;
    let current: any = entity;
    for (const part of normalizeKey(path).split(".")) {
        if (current == null) return null;
        current = current[part];
    }
    if (typeof current === "number") return current;
    return current &&
        typeof current === "object" &&
        typeof current.value === "number"
        ? current.value
        : null;
};

export const resolveMaxValue = (entity: RuntimeEntity, bar: any) => {
    if (!bar) return null;
    if (typeof bar.max === "number") return bar.max;
    return resolveNumber(entity, bar.maxKey);
};

export const resolveActionValue = (entity: RuntimeEntity, value: unknown) => {
    if (typeof value === "number") return value;
    if (value === "global.dt" || value === "globals.dt") return PROGRESS_DT;
    if (typeof value === "string" && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    if (typeof value === "string" && value.includes("powerSink.efficiency"))
        return 1;
    return typeof value === "string" ? resolveNumber(entity, value) : null;
};

export const formatNumber = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    const text = rounded.toFixed(2);
    return text.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

export const formatTarget = (target: string) => {
    const normalized = normalizeKey(target);
    return normalized.split(".").pop() ?? normalized;
};

export const formatYieldLabel = (
    amount: number,
    label: string,
    frequency: number,
) => {
    if (frequency >= 1) {
        return `${formatNumber(amount * frequency)} ${label} / sec`;
    }
    return `${formatNumber(amount)} ${label}`;
};

export const formatSignedRateLabel = (target: string, rate: number) => {
    const sign = rate >= 0 ? "+" : "-";
    const magnitude = Math.abs(rate);
    return `${sign}${formatNumber(magnitude)} ${formatTarget(target)} / sec`;
};

