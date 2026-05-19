import type { AttributeSet } from "../../../../../data/schemas/game/body";
import type {
    EntityModifierLabel,
    EntityTraitSummary,
} from "../entityAnalysis/entityAnalysis.types";
import type { HabitiDisplayEntry } from "../../../../../game/habiti/resolveHabitiDisplayEntries";

export type BodyCardData = {
    subjectId: string | undefined;
    isPermanent: boolean;
    showIdentityTitle: boolean;
    displayName: string;
    description: string;
    fallbackIconId: string;
    level: number;
    xpMax: number;
    xpRate: number;
    baseAttributes: AttributeSet;
    attributes: AttributeSet;
    modifiers: EntityModifierLabel[];
    traits: EntityTraitSummary[];
    habiti: HabitiDisplayEntry[];
};
