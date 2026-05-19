import type { AttributeSet } from "../../../../../data/schemas/game/body";

export type BodyBrickRenderData = {
    entityId: string;
    subjectId: string;
    fallbackIconId: string;
    liveLevel: number;
    attributes: AttributeSet;
    displayHealth: number;
    displayMaxHealth: number;
    hasUnownedHabiti: boolean;
    statusIcons: Array<{ traitId: string; iconId: string }>;
};