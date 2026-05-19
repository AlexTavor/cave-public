import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";

const isEntityDepleted = (entity: unknown): boolean =>
    (entity as { state?: Record<string, { value?: unknown }> } | undefined)
        ?.state?.is_depleted?.value === true;

export const rejectDepletedAssignmentDispatch = (
    context: CommandHandlerContext,
    targetId: string,
): boolean => {
    const target = context.world.entities.find(
        (entity) => entity.id === targetId,
    );
    if (!target?.assignment || !isEntityDepleted(target)) return false;
    context.telemetry.log(
        "errors",
        `DISPATCH_BODY failed: target '${targetId}' is depleted.`,
    );
    return true;
};
