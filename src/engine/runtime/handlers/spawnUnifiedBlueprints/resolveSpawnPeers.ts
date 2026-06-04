import type { CommandHandlerContext } from "../types";
import { mintSpawnId } from "../mintSpawnId";
import type { UnifiedBlueprintMemberships } from "../unifiedBlueprints";
import {
    hasUnifiedBlueprintSpawnTrigger,
    readUnifiedBlueprintMemberships,
} from "../unifiedBlueprints";

export type QueuedPeer = {
    blueprintId: string;
    blueprint: unknown;
    peerId: string;
};

export const resolveSpawnPeers = (
    source: UnifiedBlueprintMemberships,
    sourceBlueprintId: string,
    planned: string[],
    context: CommandHandlerContext,
): QueuedPeer[] =>
    Object.entries(context.cartridge.blueprints)
        .filter(([blueprintId, bp]) => {
            if (
                blueprintId === sourceBlueprintId ||
                planned.includes(blueprintId) ||
                context.world.entities.some(
                    (entity) => entity.blueprintId === blueprintId,
                )
            ) {
                return false;
            }
            return hasUnifiedBlueprintSpawnTrigger(
                source,
                readUnifiedBlueprintMemberships(bp),
            );
        })
        .map(([blueprintId, blueprint]) => ({
            blueprintId,
            blueprint,
            peerId: mintSpawnId(context.world),
        }));
