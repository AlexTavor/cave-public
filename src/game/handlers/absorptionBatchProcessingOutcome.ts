import type { RuntimeEntity } from "../../engine/runtime/types";
import { readKnownHabiti } from "../habiti/knownHabiti";
import { resolveSingleAbsorptionOutcome } from "./resolveAbsorptionHabitiOutcome";

type HabitiContext = {
    cave: RuntimeEntity;
    entities?: RuntimeEntity[];
    bonuses: {
        absorptionXpConversionBonus: number;
        resourceGainMultipliers: Record<string, number>;
    };
    habitusIndex?: Record<string, unknown>;
    onUnknownHabitusId?: (id: string) => void;
};

type ProcessingOutcome = {
    newHabiti: Set<string>;
    knownHabiti: Set<string>;
    resourceTotals: Map<string, number>;
    xpTotal: number;
};

export const createProcessingOutcome = (
    habiti?: HabitiContext,
): ProcessingOutcome => ({
    newHabiti: new Set<string>(),
    knownHabiti: new Set<string>(
        readKnownHabiti(habiti?.cave, habiti?.entities ?? []),
    ),
    resourceTotals: new Map<string, number>(),
    xpTotal: 0,
});

export const recordProcessingOutcome = (
    outcome: ProcessingOutcome,
    station: RuntimeEntity,
    bodyEntity: RuntimeEntity | null,
    habiti?: HabitiContext,
) => {
    if (!habiti || !bodyEntity) return;
    const result = resolveSingleAbsorptionOutcome({
        station,
        bodyEntity,
        knownHabiti: outcome.knownHabiti,
        bonuses: habiti.bonuses,
        habitusIndex: habiti.habitusIndex,
        onUnknownHabitusId: habiti.onUnknownHabitusId,
    });
    outcome.xpTotal += result.xp;
    result.resources.forEach(({ resource, amount }) => {
        outcome.resourceTotals.set(
            resource,
            (outcome.resourceTotals.get(resource) ?? 0) + amount,
        );
    });
    result.newHabiti.forEach((id) => {
        outcome.newHabiti.add(id);
        outcome.knownHabiti.add(id);
    });
};

export const finalizeProcessingOutcome = (outcome: ProcessingOutcome) => ({
    newHabiti: [...outcome.newHabiti].sort((a, b) => a.localeCompare(b)),
    ownedHabitiAfterProcessing: [...outcome.knownHabiti].sort((a, b) =>
        a.localeCompare(b),
    ),
    xpTotal: outcome.xpTotal,
    resourceTotals: [...outcome.resourceTotals.entries()].map(
        ([resource, amount]) => ({ resource, amount }),
    ),
});
