import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { readAssignmentId } from "../assignment/bodyAssignment";
import { isAssignmentOwnerUsable } from "../assignment/assignmentOwnerUsability";

export class AssignmentOwnerValiditySystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
    ): void {
        const updates = snapshot
            .getEntities()
            .filter(
                (entity) => entity.id && (entity as { body?: unknown }).body,
            )
            .flatMap((entity) => {
                const ownerId = readAssignmentId(entity as any);
                if (!entity.id || ownerId === "sys_world") return [];
                const owner = snapshot.getEntity(ownerId) as any;
                return isAssignmentOwnerUsable(snapshot, owner)
                    ? []
                    : [{ bodyId: entity.id, ownerId: "sys_world" }];
            });
        if (updates.length === 0) return;
        commands.enqueue({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates },
        });
    }
}
