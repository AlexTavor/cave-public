import { describe, expect, it } from "vitest";
import {
    readBodyOwner,
    runAssignBodiesBatch,
} from "./AssignBodiesBatchHandler.testUtils";

describe("AssignBodiesBatchHandler drag_restore", () => {
    it("rejects guarded drag_restore when the current owner does not match", () => {
        const context = runAssignBodiesBatch(
            [
                {
                    bodyId: "body-1",
                    ownerId: "origin-node",
                    mode: "drag_restore",
                    expectedCurrentOwnerId: "sys_pointer",
                },
            ],
            [
                { id: "sys_world", assignment: { assignedIds: [] } },
                { id: "body-1", body: { assignmentId: "other-node" } },
                { id: "origin-node", assignment: { assignedIds: [] } },
            ],
        );

        expect(readBodyOwner(context, "body-1")).toBe("other-node");
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("expected 'sys_pointer'"),
        );
    });

    it("rejects drag_restore when the recorded origin owner is missing", () => {
        const context = runAssignBodiesBatch(
            [
                {
                    bodyId: "body-1",
                    ownerId: "origin-node",
                    mode: "drag_restore",
                    expectedCurrentOwnerId: "sys_pointer",
                },
            ],
            [
                { id: "sys_world", assignment: { assignedIds: [] } },
                { id: "sys_pointer", assignment: { assignedIds: ["body-1"] } },
                { id: "body-1", body: { assignmentId: "sys_pointer" } },
            ],
        );

        expect(readBodyOwner(context, "body-1")).toBe("sys_pointer");
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("missing drag restore owner"),
        );
    });
});
