import { IconKey } from "../../../../lib/foundation/icon-registry/IconKey";

const TRAIT_ICON_MAP: Record<string, string> = {
    cold: IconKey.ResourceHeat,
    starving: IconKey.ResourceFood,
};

export const resolveBodyStatusIcon = (traitId: string): string | null =>
    TRAIT_ICON_MAP[traitId] ?? null;
