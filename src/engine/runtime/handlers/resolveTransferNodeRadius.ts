import type { DisplayAsset } from "../../../data/schemas/assets/displays";
import { resolveTransferVisualType } from "./transferUtils";

interface TransferNodeRadiusRule {
    minValue: number;
    minRadius: number;
    maxValue: number;
    maxRadius: number;
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const isValidRule = (value: unknown): value is TransferNodeRadiusRule => {
    const rule = value as TransferNodeRadiusRule | null;
    return (
        !!rule &&
        isFiniteNumber(rule.minValue) &&
        isFiniteNumber(rule.maxValue) &&
        isFiniteNumber(rule.minRadius) &&
        isFiniteNumber(rule.maxRadius) &&
        rule.minRadius >= 0 &&
        rule.maxRadius >= 0 &&
        rule.minValue <= rule.maxValue
    );
};

const resolveRuleRadius = (amount: number, rule: TransferNodeRadiusRule) => {
    if (rule.minValue === rule.maxValue)
        return amount < rule.minValue ? rule.minRadius : rule.maxRadius;
    if (amount <= rule.minValue) return rule.minRadius;
    if (amount >= rule.maxValue) return rule.maxRadius;
    const ratio = (amount - rule.minValue) / (rule.maxValue - rule.minValue);
    return rule.minRadius + (rule.maxRadius - rule.minRadius) * ratio;
};

export const resolveTransferNodeRadius = (params: {
    payload: Record<string, number>;
    displays: Record<string, unknown>;
    fallbackRadius: number;
}): { radius: number; warning: string | null } => {
    const { payload, displays, fallbackRadius } = params;
    const resourceKey = resolveTransferVisualType(payload);
    if (!resourceKey) return { radius: fallbackRadius, warning: null };
    const asset = displays[resourceKey] as DisplayAsset | undefined;
    if (asset?.type !== "resource")
        return { radius: fallbackRadius, warning: null };
    const rule = asset.transferNodeRadiusByValue;
    if (rule == null) return { radius: fallbackRadius, warning: null };
    const amount = payload[resourceKey];
    if (!isFiniteNumber(amount))
        return { radius: fallbackRadius, warning: null };
    if (!isValidRule(rule)) {
        return {
            radius: fallbackRadius,
            warning: `Invalid transferNodeRadiusByValue on display '${resourceKey}'.`,
        };
    }
    return { radius: resolveRuleRadius(amount, rule), warning: null };
};
