import { attributesEqual } from "../../../../../game/systems/body/attributes";
import { resolveBodyDisplayName } from "../selectionUtils";

export const selectBodyLevel = (entity: any) => entity.body?.level ?? 1;
export const selectBodyHealth = (entity: any) => entity.body?.health ?? 0;
export const selectBodyMaxHealth = (entity: any) => entity.body?.maxHealth ?? 0;
export const selectBodyXpRate = (entity: any) => entity.body?.xpRate ?? 1;
export const selectBodyAttributes = (entity: any) => entity.body?.attributes;
export const selectBodyBaseAttributes = (entity: any) =>
    entity.body?.baseAttributes;
export const selectBodyDisplayName = (entity: any) =>
    resolveBodyDisplayName(entity);
export const selectBodyFallbackIconId = (entity: any) =>
    entity.body?.passport?.portraitIcon ??
    entity.display?.display_key ??
    "unknown";
export const selectBodyHabiti = (entity: any) => entity.body?.habiti ?? [];
export const bodyAttributesComparer = (left: any, right: any) => {
    if (left === right) return true;
    if (!left || !right) return false;
    return attributesEqual(left, right);
};
