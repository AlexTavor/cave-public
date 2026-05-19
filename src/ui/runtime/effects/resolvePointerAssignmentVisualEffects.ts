import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";
import {
    readAssignmentTransitions,
    type RuntimeAssignmentTransition,
} from "../../../engine/runtime/commandMetadata";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeVisualEvent } from "./runtimeVisualEvents";

const readBody = (snapshot: Snapshot, bodyId: string) =>
    snapshot.getPhysicsBody(bodyId);

export const resolvePointerAssignmentVisualEffects = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
): RuntimeVisualEvent[] => {
    const effects: RuntimeVisualEvent[] = [];
    commands.forEach((command) => {
        if (command.type !== RuntimeCommandType.ASSIGN_BODIES_BATCH) return;
        readAssignmentTransitions(command).forEach(
            ({
                bodyId,
                beforeOwnerId,
                afterOwnerId,
            }: RuntimeAssignmentTransition) => {
                const body =
                    readBody(currentSnapshot, bodyId) ??
                    readBody(previousSnapshot, bodyId);
                if (
                    beforeOwnerId !== "sys_pointer" &&
                    afterOwnerId === "sys_pointer"
                ) {
                    if (!body) return;
                    effects.push({
                        kind: "spawn_body_pickup_effect",
                        entityId: bodyId,
                        x: body.x,
                        y: body.y,
                        radius: body.radius,
                    });
                }
                if (
                    beforeOwnerId === "sys_pointer" &&
                    afterOwnerId !== "sys_pointer"
                ) {
                    if (!body) return;
                    effects.push({
                        kind: "spawn_body_drop_effect",
                        entityId: bodyId,
                        x: body.x,
                        y: body.y,
                        radius: body.radius,
                    });
                }
            },
        );
    });
    return effects;
};
