import { describe, expect, it } from "vitest";
import { UpdateAssignmentHandler } from "./UpdateAssignmentHandler";
import { RuntimeCommandType } from "../types";
import { makeHandlerContext } from "./handlerTestUtils";

describe("UpdateAssignmentHandler", () => {
    it("updates assignedIds on the assignment component", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "station-a",
            assignment: { slots: 1, locking: true, assignedIds: [] },
        });

        const handler = new UpdateAssignmentHandler();
        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_ASSIGNMENT,
                payload: { entityId: "station-a", assignedIds: ["p1"] },
            },
            context,
        );

        const entity = context.world.entities.find((e) => e.id === "station-a");
        expect((entity as any).assignment.assignedIds).toEqual(["p1"]);
    });

    it("logs an error when the entity is missing", () => {
        const context = makeHandlerContext();
        const handler = new UpdateAssignmentHandler();

        handler.handle(
            {
                type: RuntimeCommandType.UPDATE_ASSIGNMENT,
                payload: { entityId: "missing", assignedIds: [] },
            },
            context,
        );

        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("missing"),
        );
    });
});
