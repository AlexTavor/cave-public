import { describe, expect, it } from "vitest";
import {
    readBodyOwner,
    runAssignBodiesBatch,
} from "./AssignBodiesBatchHandler.testUtils";

describe("AssignBodiesBatchHandler validation", () => {
    it("rejects filter mismatches loudly and preserves ownership", () => {
        const context = runAssignBodiesBatch(
            [{ bodyId: "body-1", ownerId: "node-1" }],
            [
                { id: "sys_world", assignment: { assignedIds: [] } },
                { id: "body-1", body: { assignmentId: "sys_world" } },
                {
                    id: "node-1",
                    assignment: {
                        assignedIds: [],
                        filter: [
                            { kind: "required_traits_all", ids: ["swift"] },
                        ],
                    },
                },
            ],
        );

        expect(readBodyOwner(context, "body-1")).toBe("sys_world");
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("filter_mismatch"),
        );
    });

    it("rejects slot overflow but still applies valid updates in the same batch", () => {
        const context = runAssignBodiesBatch(
            [
                { bodyId: "body-1", ownerId: "full-node" },
                { bodyId: "body-2", ownerId: "open-node" },
            ],
            [
                { id: "sys_world", assignment: { assignedIds: [] } },
                { id: "body-1", body: { assignmentId: "sys_world" } },
                { id: "body-2", body: { assignmentId: "sys_world" } },
                {
                    id: "full-node",
                    assignment: { slots: 1, assignedIds: ["held"] },
                },
                { id: "open-node", assignment: { slots: 1, assignedIds: [] } },
            ],
        );

        expect(readBodyOwner(context, "body-1")).toBe("sys_world");
        expect(readBodyOwner(context, "body-2")).toBe("open-node");
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("slots_full"),
        );
    });

    it("restores to origin in drag_restore mode even when the origin is full", () => {
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
                {
                    id: "origin-node",
                    assignment: { slots: 1, assignedIds: ["held"] },
                },
            ],
        );

        expect(readBodyOwner(context, "body-1")).toBe("origin-node");
    });
});
