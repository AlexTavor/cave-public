import type { PassiveEffect } from "../../../data/schemas/components";
import {
    CommandBuffer,
    RuntimeCommand,
    RuntimeCommandType,
    BodyUpdatePayload,
} from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { resolveTargetKey } from "./passiveEffectUtils";
import { enqueuePowerSinkUpdate } from "./passiveEffectsPowerSink";

export const collectPassiveEffects = (
    entity: any,
    snapshot: Snapshot,
    getBuffsFor: (tags: string[]) => PassiveEffect[],
): PassiveEffect[] => {
    const localSource =
        entity.passiveEffects ??
        (entity.blueprintId
            ? snapshot.getBlueprint(entity.blueprintId)?.components
                  ?.passiveEffects
            : undefined);
    const localEffects = Array.isArray(localSource)
        ? (localSource as PassiveEffect[])
        : [];
    const tags = Array.isArray(entity.tags) ? (entity.tags as string[]) : [];
    const remoteEffects = getBuffsFor(tags);

    return [...localEffects, ...remoteEffects];
};

const enqueueStateUpdate = (
    commands: CommandBuffer<RuntimeCommand>,
    entityId: string,
    fullPath: string,
    finalValue: number,
) => {
    const key = resolveTargetKey(fullPath);
    if (!key) return;
    const isMax = fullPath.endsWith(".max");
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId,
            key,
            ...(isMax ? {} : { value: finalValue }),
            max: isMax ? finalValue : undefined,
        },
    });
};

const applyBodyPath = (
    bodyUpdate: Partial<BodyUpdatePayload>,
    target: string,
    finalValue: number,
): void => {
    if (["health", "maxHealth", "xp", "level"].includes(target)) {
        (bodyUpdate as any)[target] = finalValue;
    } else if (target.startsWith("baseAttributes.")) {
        const attrKey = target.split(".")[1];
        bodyUpdate.baseAttributes = bodyUpdate.baseAttributes || ({} as any);
        (bodyUpdate.baseAttributes as any)[attrKey] = finalValue;
    }
};

export const applyPendingUpdates = (
    commands: CommandBuffer<RuntimeCommand>,
    entity: { id?: string },
    pendingUpdates: Record<string, number>,
): void => {
    if (!entity.id) return;

    let bodyUpdate: Partial<BodyUpdatePayload> | null = null;

    for (const [fullPath, finalValue] of Object.entries(pendingUpdates)) {
        if (fullPath.startsWith("self.state.")) {
            enqueueStateUpdate(commands, entity.id, fullPath, finalValue);
            continue;
        }

        if (fullPath.startsWith("self.powerSink.")) {
            enqueuePowerSinkUpdate(commands, entity.id, fullPath, finalValue);
            continue;
        }

        if (fullPath.startsWith("self.body.")) {
            const target = fullPath.replace("self.body.", "");
            // BodySystem derives attributes with modifiers
            if (target.startsWith("attributes.")) continue;
            bodyUpdate = bodyUpdate ?? { entityId: entity.id };
            applyBodyPath(bodyUpdate, target, finalValue);
        }
    }

    if (bodyUpdate) {
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_BODIES_BATCH,
            payload: {
                updates: [bodyUpdate as BodyUpdatePayload],
            },
        });
    }
};
