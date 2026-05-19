import { LOGIC_STEP_MS } from "../../../engine/runtime/runtimeConstants";

type RateSign = "pos" | "neg" | "zero";

const formatWithSuffix = (value: number, suffix: string): string => {
    const rounded = Math.round(value);
    return `${rounded}${suffix}`;
};

export const formatCompactNumber = (value: number): string => {
    if (!Number.isFinite(value)) return "0";
    const sign = value < 0 ? "-" : "";
    const abs = Math.abs(value);

    if (abs >= 1_000_000_000) {
        return `${sign}${formatWithSuffix(abs / 1_000_000_000, "b")}`;
    }
    if (abs >= 1_000_000) {
        return `${sign}${formatWithSuffix(abs / 1_000_000, "m")}`;
    }
    if (abs >= 1_000) {
        return `${sign}${formatWithSuffix(abs / 1_000, "k")}`;
    }

    const rounded = Math.round(abs);
    return `${sign}${rounded}`;
};

export const formatRateNumber = (value: number): string => {
    if (!Number.isFinite(value)) return "0";
    const abs = Math.abs(value);

    if (abs >= 1_000_000_000) {
        return `${formatRateNumber(abs / 1_000_000_000)}b`;
    }
    if (abs >= 1_000_000) {
        return `${formatRateNumber(abs / 1_000_000)}m`;
    }
    if (abs >= 1_000) {
        return `${formatRateNumber(abs / 1_000)}k`;
    }

    const rounded = Math.round(abs * 10) / 10;
    const hasDecimal = rounded % 1 !== 0;
    return hasDecimal ? rounded.toFixed(1) : rounded.toFixed(0);
};

export const resolveRateDisplay = (
    ratePerSecond: number,
): { text: string; sign: RateSign } => {
    if (!Number.isFinite(ratePerSecond)) {
        return { text: "0/s", sign: "zero" };
    }

    if (Math.abs(ratePerSecond) < 0.0001) {
        return { text: "0/s", sign: "zero" };
    }

    const sign: RateSign = ratePerSecond > 0 ? "pos" : "neg";
    const prefix = ratePerSecond > 0 ? "+" : "-";
    const text = `${prefix}${formatRateNumber(Math.abs(ratePerSecond))}/s`;
    return { text, sign };
};

export const formatRuntimeTime = (tick: number): string => {
    const safeTick = Number.isFinite(tick) ? Math.max(0, tick) : 0;
    const totalSeconds = (safeTick * LOGIC_STEP_MS) / 1000;
    const inGameHours = totalSeconds / 3600;
    const gameYears = inGameHours * 5;

    const years = Math.floor(gameYears) + 1;
    const yearFraction = gameYears - Math.floor(gameYears);
    const totalMonths = yearFraction * 12;
    const months = Math.floor(totalMonths) + 1;
    const monthFraction = totalMonths - Math.floor(totalMonths);
    const totalDays = monthFraction * 30;
    const days = Math.floor(totalDays) + 1;
    const dayFraction = totalDays - Math.floor(totalDays);
    const hours = Math.floor(dayFraction * 24)
        .toString()
        .padStart(2, "0");

    return `${years}:${months}:${days}:${hours}`;
};

