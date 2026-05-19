import type { AttributeSet } from "../../data/schemas/game/body";
import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";
import { resolveOwnedCaveKnowledgeEffects } from "./resolveOwnedCaveKnowledgeEffects";

export const resolveEffectiveCaveAttributes = (input: {
    baseAttributes: Partial<AttributeSet> | undefined;
    ownedHabiti: string[];
    habitusIndex: Record<string, HabitusDefinition>;
    ownedUnderstanding?: string[];
    understandingIndex?: Record<string, UnderstandingDefinition>;
    onUnknownHabitusId?: (id: string) => void;
    onUnknownUnderstandingId?: (id: string) => void;
}) => {
    const base = {
        body: Number(input.baseAttributes?.body ?? 0),
        mind: Number(input.baseAttributes?.mind ?? 0),
        social: Number(input.baseAttributes?.social ?? 0),
    };
    const bonuses = resolveOwnedCaveKnowledgeEffects({
        ownedHabiti: input.ownedHabiti,
        habitusIndex: input.habitusIndex,
        ownedUnderstanding: input.ownedUnderstanding ?? [],
        understandingIndex: input.understandingIndex ?? {},
        onUnknownHabitusId: input.onUnknownHabitusId,
        onUnknownUnderstandingId: input.onUnknownUnderstandingId,
    });
    return {
        body: base.body + bonuses.attributeBonuses.body,
        mind: base.mind + bonuses.attributeBonuses.mind,
        social: base.social + bonuses.attributeBonuses.social,
    };
};
