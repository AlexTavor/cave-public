import {
    readCommandCause,
    readDeadBodyPresentation,
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeKilledEntityPresentation,
    type RuntimeEntity,
} from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { isBodyEntity } from "../notifications/resolveRuntimeNotificationEvents.helpers";

export type RuntimeBodyDeathVisual = RuntimeKilledEntityPresentation & {
    cause?: string;
};

export const collectBodyDeaths = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
): RuntimeBodyDeathVisual[] =>
    commands.flatMap((command) => {
        if (command.type === RuntimeCommandType.KILL) {
            const entityId = command.payload.entityId;
            const entity = previousSnapshot.getEntity(entityId) as
                | RuntimeEntity
                | undefined;
            const body =
                readDeadBodyPresentation(command) ??
                previousSnapshot.getPhysicsBody(entityId);
            return entity && body && isBodyEntity(entity)
                ? [
                      {
                          entityId,
                          x: body.x,
                          y: body.y,
                          radius: body.radius,
                          cause: readCommandCause(command),
                      },
                  ]
                : [];
        }
        if (command.type !== RuntimeCommandType.RESOLVE_BODY_PROCESSING) {
            return [];
        }
        return (command.metadata?.killedEntityPresentations ?? []).filter(
            (entry) =>
                isBodyEntity(previousSnapshot.getEntity(entry.entityId) ?? {}),
        );
    });
