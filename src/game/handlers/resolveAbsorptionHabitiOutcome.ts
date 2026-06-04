import type { RuntimeEntity } from "../../engine/runtime/types";
import { normalizeHabitiIds } from "../../utils/normalizeHabitiIds";
import {
    resolveOutputAmount,
    resolveProcessingOutputs,
} from "./absorptionBatchOutputs";

type BonusContext = {
    absorptionXpConversionBonus: number;
    resourceGainMultipliers: Record<string, number>;
};

const floorScaled = (amount: number, delta: number) =>
    Math.max(0, Math.floor(amount * (1 + delta)));
const absorbsHabiti = (station: RuntimeEntity) =>
    (station as { state?: any }).state?.processing_absorbs_habiti?.value ===
    true;

const applyBonus = (resource: string, amount: number, bonuses: BonusContext) =>
    resource === "xp"
        ? floorScaled(amount, bonuses.absorptionXpConversionBonus)
        : floorScaled(amount, bonuses.resourceGainMultipliers[resource] ?? 0);

const toOutputs = (map: Map<string, number>) =>
    [...map.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([resource, amount]) => ({ resource, amount }));

export const resolveSingleAbsorptionOutcome = (input: {
    station: RuntimeEntity;
    bodyEntity: RuntimeEntity;
    knownHabiti: Set<string>;
    bonuses: BonusContext;
    habitusIndex?: Record<string, unknown>;
    onUnknownHabitusId?: (id: string) => void;
}) => {
    const outputs = new Map<string, number>();
    const body = (input.bodyEntity as { body?: any }).body ?? {};
    resolveProcessingOutputs(input.station).forEach((output) => {
        const amount = applyBonus(
            output.resource,
            resolveOutputAmount(body, output),
            input.bonuses,
        );
        if (amount <= 0) return;
        outputs.set(
            output.resource,
            (outputs.get(output.resource) ?? 0) + amount,
        );
    });
    const carriedHabiti = absorbsHabiti(input.station)
        ? normalizeHabitiIds(body.habiti ?? [])
        : [];
    carriedHabiti
        .filter((id) => input.habitusIndex && !input.habitusIndex[id])
        .forEach((id) => input.onUnknownHabitusId?.(id));
    const eligibleHabiti = input.habitusIndex
        ? carriedHabiti.filter((id) => input.habitusIndex?.[id])
        : carriedHabiti;
    const newHabiti = eligibleHabiti.filter((id) => !input.knownHabiti.has(id));
    const duplicateHabiti = eligibleHabiti.filter((id) =>
        input.knownHabiti.has(id),
    );
    return {
        xp: outputs.get("xp") ?? 0,
        resources: toOutputs(
            new Map([...outputs].filter(([id]) => id !== "xp")),
        ),
        newHabiti,
        duplicateHabiti,
    };
};

export const resolveBatchAbsorptionOutcome = (input: {
    station: RuntimeEntity;
    bodyEntities: RuntimeEntity[];
    knownHabiti: string[];
    bonuses: BonusContext;
    habitusIndex?: Record<string, unknown>;
    onUnknownHabitusId?: (id: string) => void;
}) => {
    const knownHabiti = new Set(normalizeHabitiIds(input.knownHabiti));
    const resources = new Map<string, number>();
    const newHabiti = new Set<string>();
    const duplicateHabiti = new Set<string>();
    let xp = 0;

    input.bodyEntities.forEach((bodyEntity) => {
        const outcome = resolveSingleAbsorptionOutcome({
            station: input.station,
            bodyEntity,
            knownHabiti,
            bonuses: input.bonuses,
            habitusIndex: input.habitusIndex,
            onUnknownHabitusId: input.onUnknownHabitusId,
        });
        xp += outcome.xp;
        outcome.resources.forEach((item) => {
            resources.set(
                item.resource,
                (resources.get(item.resource) ?? 0) + item.amount,
            );
        });
        outcome.newHabiti.forEach((id) => {
            newHabiti.add(id);
            knownHabiti.add(id);
        });
        outcome.duplicateHabiti.forEach((id) => duplicateHabiti.add(id));
    });

    return {
        bodyCount: input.bodyEntities.length,
        xp,
        resources: toOutputs(resources),
        newHabiti: normalizeHabitiIds([...newHabiti]),
        duplicateHabiti: normalizeHabitiIds([...duplicateHabiti]),
    };
};
