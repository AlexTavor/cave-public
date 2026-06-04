import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../engine/runtime/types";
import type { HabitusDefinition } from "../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../data/schemas/game/understanding";
import { resolveOwnedCaveKnowledgeEffects } from "./resolveOwnedCaveKnowledgeEffects";
import { listResourceGainBonusResources } from "./resourceGainBonusState";
import { listProducerOutputBonusTags } from "./producerOutputBonusState";
import {
    producerOutputBonusStateKey,
    resourceGainBonusStateKey,
} from "../../utils/habitiBonusStateKeys";
import { purgeProgressMaxBonusStateKey } from "./purgeProgressBonusState";

export const enqueueResourceGainBonusStateSync = (input: {
    commands?: CommandBuffer<RuntimeCommand> | null;
    world?: RuntimeEntity | null;
    habitusIndex: Record<string, HabitusDefinition>;
    understandingIndex?: Record<string, UnderstandingDefinition>;
    onUnknownHabitusId?: (id: string) => void;
    onUnknownUnderstandingId?: (id: string) => void;
}) => {
    if (!input.commands || !input.world?.id) return;
    const entityId = input.world.id;
    const cave = (
        input.world as {
            cave?: { ownedHabiti?: string[]; ownedUnderstanding?: string[] };
        }
    ).cave;
    const ownedHabiti = cave?.ownedHabiti;
    const resolved = resolveOwnedCaveKnowledgeEffects({
        ownedHabiti: Array.isArray(ownedHabiti) ? ownedHabiti : [],
        habitusIndex: input.habitusIndex,
        ownedUnderstanding: Array.isArray(cave?.ownedUnderstanding)
            ? cave.ownedUnderstanding
            : [],
        understandingIndex: input.understandingIndex ?? {},
        onUnknownHabitusId: input.onUnknownHabitusId,
        onUnknownUnderstandingId: input.onUnknownUnderstandingId,
    });
    input.commands?.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId,
            key: purgeProgressMaxBonusStateKey,
            value: resolved.purgeProgressMaxBonus,
            visible: false,
        },
    });
    listResourceGainBonusResources(
        input.habitusIndex,
        input.understandingIndex,
    ).forEach((resource) => {
        input.commands?.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId,
                key: resourceGainBonusStateKey(resource),
                value: resolved.resourceGainMultipliers[resource] ?? 0,
                visible: false,
            },
        });
    });
    listProducerOutputBonusTags(
        input.habitusIndex,
        input.understandingIndex,
    ).forEach((tag) => {
        input.commands?.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId,
                key: producerOutputBonusStateKey(tag),
                value: resolved.producerOutputTagMultipliers[tag] ?? 0,
                visible: false,
            },
        });
    });
};
