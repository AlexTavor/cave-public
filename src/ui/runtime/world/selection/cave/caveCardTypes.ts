import type { AttributeTotals } from "../../../../../game/systems/body/attributes";
import type { HabitiDisplayEntry } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import type {
    EntityModifierLabel,
    EntityTraitSummary,
} from "../entityAnalysis/entityAnalysis.types";

export type CaveCardData = {
    label: string;
    targetId: string;
    level: number;
    xpMax: number;
    attributes: AttributeTotals;
    habiti: HabitiDisplayEntry[];
    understanding: HabitiDisplayEntry[];
    modifiers: EntityModifierLabel[];
    traits: EntityTraitSummary[];
};
