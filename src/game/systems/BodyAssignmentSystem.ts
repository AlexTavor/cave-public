import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import {
    readAssignmentId,
    readAssignmentStatus,
} from "../assignment/bodyAssignment";
import { resolveAssignmentOwnerKind } from "../assignment/assignmentNodeKinds";
import {
    navigateAssignedBody,
    orbitAssignedBody,
} from "./body-assignment/bodyAssignmentMotion";

export class BodyAssignmentSystem implements System {
    private elapsedMs = 0;

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        this.elapsedMs += dt;
        for (const entity of snapshot.getEntities()) {
            if (!(entity as { body?: unknown }).body || !entity.id) continue;
            const ownerId = readAssignmentId(entity as any);
            const owner = snapshot.getEntity(ownerId);
            if (!owner?.id) {
                commands.enqueue({
                    type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                    payload: {
                        updates: [{ bodyId: entity.id, ownerId: "sys_world" }],
                    },
                });
                continue;
            }
            const body = snapshot.getPhysicsBody(entity.id);
            const ownerBody = snapshot.getPhysicsBody(owner.id);
            if (!body || !ownerBody) continue;
            const status = readAssignmentStatus(entity as any);
            if (status === "navigating")
                navigateAssignedBody({
                    bodyId: entity.id,
                    ownerId: owner.id,
                    owner,
                    ownerKind: resolveAssignmentOwnerKind(owner as any),
                    snapshot,
                    body,
                    ownerBody,
                    commands,
                });
            else
                orbitAssignedBody({
                    bodyId: entity.id,
                    owner,
                    body,
                    ownerBody,
                    snapshot,
                    commands,
                    timeMs: this.elapsedMs,
                });
        }
    }
}
