import type { FactType } from "../../../../data/schemas/conditions";
import {
    hasCarrierArrived,
    isCarrierEntity,
} from "../../../../game/carriers/carrier";
import {
    RuntimeCommandType,
    type RuntimeCommand,
    type SpawnCarrierCommandPayload,
} from "../../../../engine/runtime/types";
import { deepClone } from "../../../../utils/objectUtils";

export const WORLD_ID = "sys_world";

const getWorld = (runtime: { getEntities: () => ReadonlyArray<any> }) =>
    runtime.getEntities().find((entity) => entity.id === WORLD_ID);

export const extractRebirthCave = (runtime: {
    getEntities: () => ReadonlyArray<any>;
}) => {
    const cave = deepClone(getWorld(runtime)?.cave ?? null);
    if (cave && typeof cave === "object") delete cave.pendingHabiti;
    return cave;
};

export const extractRebirthCarriers = (runtime: {
    getEntities: () => ReadonlyArray<any>;
    getPhysicsBody: (id: string) => { x?: number; y?: number } | undefined;
}) =>
    runtime
        .getEntities()
        .filter((entity) => isCarrierEntity(entity) && entity.id)
        .map((entity) => ({
            id: entity.id,
            x:
                runtime.getPhysicsBody(entity.id)?.x ??
                (entity.physics as { x?: number })?.x,
            y:
                runtime.getPhysicsBody(entity.id)?.y ??
                (entity.physics as { y?: number })?.y,
            arrived: hasCarrierArrived(entity),
            tags: [...(entity.tags ?? [])],
            commands: deepClone(entity.carrier.commands),
        })) as SpawnCarrierCommandPayload[];

export const enqueueRebirthCarriers = (
    runtime: { commands: { enqueue: (command: RuntimeCommand) => void } },
    carriers: SpawnCarrierCommandPayload[],
) => {
    carriers.forEach((payload) =>
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN_CARRIER,
            payload,
        }),
    );
};

export const extractRebirthPermanent = (runtime: {
    getEntities: () => ReadonlyArray<any>;
}) => deepClone(getWorld(runtime)?.permanent ?? {});

export const enqueueRebirthPermanentFacts = (
    runtime: { commands: { enqueue: (command: RuntimeCommand) => void } },
    permanent: Partial<Record<FactType, Record<string, number>>>,
) => {
    (
        Object.entries(permanent) as Array<[FactType, Record<string, number>]>
    ).forEach(([factType, values]) => {
        Object.entries(values).forEach(([factAbout, delta]) => {
            runtime.commands.enqueue({
                type: RuntimeCommandType.ADJUST_FACT,
                payload: { scope: "permanent", factType, factAbout, delta },
            });
        });
    });
};

export const formatRebirthSuccess = (skippedCount: number) =>
    skippedCount > 0
        ? `Rebirth complete. Skipped ${skippedCount} permanent entities.`
        : "Rebirth complete.";
