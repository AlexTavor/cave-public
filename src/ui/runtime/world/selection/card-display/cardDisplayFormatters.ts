import { formatCompactNumber } from "../../../status/formatters";
import type { CardDisplayTone } from "./cardDisplayTypes";

export const formatCapsuleNumber = (value: number): string =>
    Number.isFinite(value) ? formatCompactNumber(value) : "0";

export const formatCapsuleFraction = (current: number, max: number): string =>
    `${formatCapsuleNumber(current)}/${formatCapsuleNumber(max)}`;

export const formatAttributeModifier = (value: number): string => {
    if (!Number.isFinite(value) || value === 0) return "";
    const prefix = value > 0 ? "+" : "-";
    return `(${prefix}${formatCapsuleNumber(Math.abs(value))})`;
};

export const formatEffectSegmentText = (
    valueText: string,
    intervalText?: string,
): string => `${valueText}${intervalText ?? ""}`;

export const formatSignedRateText = (value: number, intervalText: string) => {
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${formatCapsuleNumber(Math.abs(value))}${intervalText}`;
};

export const resolveEffectTone = (
    text: string,
    numericSign?: number,
): CardDisplayTone => {
    if (typeof numericSign === "number" && numericSign !== 0) {
        return numericSign > 0 ? "positive" : "negative";
    }
    if (text.trim().startsWith("+")) return "positive";
    if (text.trim().startsWith("-")) return "negative";
    return "neutral";
};
