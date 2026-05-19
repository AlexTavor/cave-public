const BODY_EFFECT_ICON_IDS = {
    body: "attr_body",
    mind: "attr_mind",
    social: "attr_social",
    food: "food",
    health: "health",
    heat: "heat",
} as const;

const hasBodyEffectIcon = (
    targetKey: string,
): targetKey is keyof typeof BODY_EFFECT_ICON_IDS =>
    targetKey in BODY_EFFECT_ICON_IDS;

export const resolveBodyEffectIconId = (
    targetKey: string,
): string | undefined =>
    hasBodyEffectIcon(targetKey) ? BODY_EFFECT_ICON_IDS[targetKey] : undefined;

export const formatCompactEffectValue = (
    valueStr: string,
    intervalStr?: string,
): string => `${valueStr}${intervalStr ?? ""}`;

export const formatFullEffectValue = (
    valueStr: string,
    intervalStr: string | undefined,
    targetKey: string,
): string => `${formatCompactEffectValue(valueStr, intervalStr)} ${targetKey}`;

export const formatModifierSourceValue = (
    valueStr: string,
    intervalStr: string | undefined,
    sourceId: string,
): string => `${formatCompactEffectValue(valueStr, intervalStr)} (${sourceId})`;

