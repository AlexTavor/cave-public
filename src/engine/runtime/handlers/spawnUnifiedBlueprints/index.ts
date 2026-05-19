import {
    RuntimeCommandType,
    type RuntimeEntity,
    type SpawnCommand,
} from "../../types";
import type { CommandHandlerContext } from "../types";
import {
    readUnifiedBlueprintMemberships,
    seedUnifiedBlueprintSpawnPlan,
    shouldSuppressUnifiedBlueprintSpawns,
    UNIFIED_BLUEPRINT_SPAWN_METADATA_KEY,
} from "../unifiedBlueprints";
import { hasAuthoredParent, hasConcreteParent, matchesPeerParent } from "./resolveSpawnParent";
import { hasAuthoredPosition } from "./resolveSpawnPosition";
import { resolveSpawnPeers } from "./resolveSpawnPeers";

export const spawnUnifiedBlueprints = (
    command: SpawnCommand,
    sourceBlueprintId: string,
    sourceEntity: RuntimeEntity,
    context: CommandHandlerContext,
): void => {
    if (
        !context.commands ||
        shouldSuppressUnifiedBlueprintSpawns(command.metadata)
    ) {
        return;
    }
    const source = readUnifiedBlueprintMemberships(
        context.cartridge.blueprints[sourceBlueprintId],
    );
    if (Object.keys(source).length === 0) return;
    const planned = seedUnifiedBlueprintSpawnPlan(
        command.metadata,
        sourceBlueprintId,
    );
    const sourceParent =
        context.cartridge.blueprints[sourceBlueprintId]?.components?.parent;
    const queuedPeers = resolveSpawnPeers(source, sourceBlueprintId, planned, context);
    if (queuedPeers.length === 0) return;
    const matchingPeer = queuedPeers.find((peer) =>
        matchesPeerParent(sourceParent, peer.blueprint),
    );
    if (
        !command.payload.parentId &&
        !hasConcreteParent(sourceEntity) &&
        matchingPeer
    ) {
        sourceEntity.parent = { parentId: matchingPeer.peerId };
    }
    const nextPlanned = [
        ...planned,
        ...queuedPeers.map((peer) => peer.blueprintId),
    ];
    queuedPeers.forEach(({ blueprintId, blueprint, peerId }) => {
        const payload = {
            blueprintId,
            id: peerId,
            forcedHabiti: command.payload.forcedHabiti,
            ...(hasAuthoredParent(blueprint)
                ? {}
                : { parentId: command.payload.parentId }),
            ...(hasAuthoredPosition(blueprint)
                ? {}
                : { x: command.payload.x, y: command.payload.y }),
        };
        context.commands?.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload,
            metadata: {
                ...command.metadata,
                [UNIFIED_BLUEPRINT_SPAWN_METADATA_KEY]: nextPlanned,
            },
        });
    });
};
