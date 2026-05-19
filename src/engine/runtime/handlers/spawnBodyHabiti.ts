import type { RuntimeEntity } from "../types";
import type { CommandHandlerContext } from "./types";
import { ensureSpawnedBodyIdentity } from "./spawnBodyIdentity";

export const resolvePendingHabiti = (
    entity: RuntimeEntity,
    entityId: string,
    context: CommandHandlerContext,
    forcedHabiti?: string[],
): string[] | null => {
    const body = (entity as { body?: Record<string, unknown> }).body;
    if (!body) return null;
    return ensureSpawnedBodyIdentity(body, entityId, context, forcedHabiti);
};
