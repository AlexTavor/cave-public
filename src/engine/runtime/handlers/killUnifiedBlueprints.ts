import {
    RuntimeCommandType,
    type KillCommand,
    type RuntimeEntity,
} from "../types";
import type { CommandHandlerContext } from "./types";
import {
    hasUnifiedBlueprintSharedTag,
    readUnifiedBlueprintMemberships,
    seedUnifiedBlueprintKillPlan,
    UNIFIED_BLUEPRINT_KILL_METADATA_KEY,
} from "./unifiedBlueprints";

export const killUnifiedBlueprints = (
    command: KillCommand,
    target: RuntimeEntity,
    context: CommandHandlerContext,
): void => {
    if (!context.commands || typeof target.blueprintId !== "string") return;
    const source = readUnifiedBlueprintMemberships(
        context.cartridge.blueprints[target.blueprintId],
    );
    if (Object.keys(source).length === 0) return;
    const planned = seedUnifiedBlueprintKillPlan(
        command.metadata,
        target.id ?? "",
    );
    context.world.entities.forEach((entity) => {
        const entityId = entity.id ?? "";
        if (
            !entityId ||
            planned.includes(entityId) ||
            typeof entity.blueprintId !== "string"
        ) {
            return;
        }
        const peer = readUnifiedBlueprintMemberships(
            context.cartridge.blueprints[entity.blueprintId],
        );
        if (!hasUnifiedBlueprintSharedTag(source, peer)) return;
        planned.push(entityId);
        context.commands?.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId },
            metadata: {
                ...command.metadata,
                [UNIFIED_BLUEPRINT_KILL_METADATA_KEY]: [...planned],
            },
        });
    });
};
