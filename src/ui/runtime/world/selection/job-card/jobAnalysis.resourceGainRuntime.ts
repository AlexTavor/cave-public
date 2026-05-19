import type { BehaviorRule } from "../../../../../data/schemas/behavior";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { resolveResourceGainBonusBreakdown } from "../../../../../game/habiti/resolveResourceGainBonusBreakdown";
import { buildResourceGainTooltip } from "./resourceGainTooltipLines";
import { readNumericValue } from "../ability-display/abilityDisplay.utils";

export const resolveAmount = (entity: RuntimeEntity, value: unknown) => {
    switch (typeof value) {
        case "number":
            return value;
        case "string":
            return readNumericValue(entity, value);
        default:
            return null;
    }
};

export const resourceFromTarget = (target: string) =>
    target.split(".")[2] ?? target;

export const ruleIndex = (rule: BehaviorRule) =>
    Number(/_(\d+)$/.exec(rule.id)?.[1] ?? -1);

const readWorld = (runtime: Runtime | null) =>
    runtime?.getEntity("sys_world") as any;

const readHabitusIndex = (runtime: Runtime | null) =>
    (runtime?.getCartridge().config?.habiti ?? {}) as Record<string, any>;

const readUnderstandingIndex = (runtime: Runtime | null) =>
    (runtime?.getCartridge().config?.understanding ?? {}) as Record<
        string,
        any
    >;

const readOwnedHabiti = (runtime: Runtime | null) =>
    readWorld(runtime)?.cave?.ownedHabiti ?? [];

const readOwnedUnderstanding = (runtime: Runtime | null) =>
    readWorld(runtime)?.cave?.ownedUnderstanding ?? [];

const readEntityTags = (entity: RuntimeEntity) =>
    Array.isArray((entity as { tags?: unknown }).tags)
        ? (((entity as { tags?: unknown }).tags as string[]) ?? [])
        : [];

export const buildResourceGainEffectTooltip = (input: {
    runtime: Runtime | null;
    entity: RuntimeEntity;
    title: string;
    resource: string;
    baseAmount: number;
    finalAmount: number;
}) =>
    buildResourceGainTooltip({
        title: input.title,
        baseAmount: input.baseAmount,
        finalAmount: input.finalAmount,
        breakdown: resolveResourceGainBonusBreakdown({
            resource: input.resource,
            ownedHabiti: readOwnedHabiti(input.runtime),
            ownedUnderstanding: readOwnedUnderstanding(input.runtime),
            producerTags: readEntityTags(input.entity),
            habitusIndex: readHabitusIndex(input.runtime),
            understandingIndex: readUnderstandingIndex(input.runtime),
        }),
    });
