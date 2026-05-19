import type { EditorAbilities } from "../../../../../data/schemas/abilities";

const describeResource = (entry: any, suffix: string, index: number) =>
    entry.displayName || entry.resource
        ? `${entry.displayName || entry.resource}-${suffix}`
        : `${suffix[0].toUpperCase()}${suffix.slice(1)} ${index + 1}`;

const formatAbilityLabel = (ability: string) =>
    ability === "worldPresence"
        ? "World Presence"
        : String(ability)
              .replaceAll(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase());

export const getConditionalActivationTargetLabel = (
    ability: keyof EditorAbilities,
    entry: any,
    index: number,
) => {
    if (ability === "storage") return describeResource(entry, "storage", index);
    if (ability === "production")
        return entry.resource
            ? `${entry.resource}-production`
            : `Production ${index + 1}`;
    if (ability === "upkeep") return describeResource(entry, "upkeep", index);
    if (ability === "draft")
        return entry.poolId ? `Draft: ${entry.poolId}` : `Draft ${index + 1}`;
    if (ability === "updater")
        return entry.target
            ? `Updater: ${entry.target}`
            : `Updater ${index + 1}`;
    if (ability === "triggeredActions") return `Triggered Actions ${index + 1}`;
    if (ability === "notifications") return `Notification: ${entry.trigger}`;
    const suffix = ["conversion", "spawner", "sampler"].includes(ability)
        ? ` ${index + 1}`
        : "";
    return `${formatAbilityLabel(ability)}${suffix}`.trim();
};

export const formatConditionalActivationAbilityLabel = formatAbilityLabel;
