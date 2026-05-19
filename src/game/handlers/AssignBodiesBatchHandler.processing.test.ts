import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { readAssignmentStatus } from "../assignment/bodyAssignment";
import { AssignBodiesBatchHandler } from "./AssignBodiesBatchHandler";

describe("AssignBodiesBatchHandler processing", () => {
    it("starts newly assigned processing bodies navigating and resets progress", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);
        context.world.add({
            id: "body-1",
            body: { assignmentId: "sys_world", assignmentStatus: "orbiting" },
            state: {
                assignment_progress_ms: { value: 250 },
                assignment_progress_ratio: { value: 0.5 },
                assignment_required_ms: { value: 300 },
                assignment_orbit_phase_offset: { value: 0.2 },
                assignment_orbit_radius_offset: { value: 8 },
            },
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: [] },
            state: { assignment_duration: { value: 12 } },
        } as any);

        new AssignBodiesBatchHandler().handle(
            {
                type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                payload: { updates: [{ bodyId: "body-1", ownerId: "node-1" }] },
            } as any,
            context,
        );

        expect(
            readAssignmentStatus(
                context.world.entities.find(
                    (entity) => entity.id === "body-1",
                ) as any,
            ),
        ).toBe("navigating");
        const body = context.world.entities.find(
            (entity) => entity.id === "body-1",
        ) as any;
        expect(body.state.assignment_required_ms.value).toBe(12000);
        expect(body.state.assignment_progress_ms.value).toBe(0);
        expect(body.state.assignment_progress_ratio.value).toBe(0);
        expect(body.state.assignment_orbit_phase_offset).toBeUndefined();
        expect(body.state.assignment_orbit_radius_offset).toBeUndefined();
    });

    it("records assignment transitions on the command metadata", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            assignment: { assignedIds: [] },
        } as any);
        context.world.add({
            id: "body-1",
            body: { assignmentId: "sys_world" },
        } as any);
        context.world.add({
            id: "node-1",
            assignment: { assignedIds: [] },
        } as any);
        const command = {
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-1", ownerId: "node-1" }] },
        } as any;

        new AssignBodiesBatchHandler().handle(command, context);

        expect(command.metadata.assignmentTransitions).toEqual([
            {
                bodyId: "body-1",
                beforeOwnerId: "sys_world",
                afterOwnerId: "node-1",
            },
        ]);
    });
});
