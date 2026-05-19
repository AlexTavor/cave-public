import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { resolveDraggedBodyDropTarget } from "./resolveDraggedBodyDropTarget";

const makeSnapshot = (entities: any[], bodies: Record<string, any>) =>
    new Snapshot(entities, { getBody: (id: string) => bodies[id] } as any);

describe("resolveDraggedBodyDropTarget", () => {
    it("resolves the nearest accepting target for the dragged body", () => {
        const snapshot = makeSnapshot(
            [
                {
                    id: "sys_pointer",
                    state: { pointer_connection_radius: { value: 40 } },
                },
                {
                    id: "body-1",
                    body: { assignmentId: "sys_pointer" },
                    traits: ["swift"],
                },
                {
                    id: "node-2",
                    assignment: { assignedIds: [] },
                    powerSink: {},
                },
                {
                    id: "node-1",
                    assignment: { assignedIds: [] },
                    powerSink: {},
                },
            ],
            {
                "node-1": { x: 10, y: 0, radius: 0 },
                "node-2": { x: 20, y: 0, radius: 0 },
            },
        );

        expect(resolveDraggedBodyDropTarget(snapshot, "body-1", 0, 0)).toEqual({
            valid: true,
            ownerId: "node-1",
            kind: "power",
        });
    });

    it("returns no_target when the pointer is out of range", () => {
        const snapshot = makeSnapshot(
            [
                {
                    id: "sys_pointer",
                    state: { pointer_connection_radius: { value: 10 } },
                },
                { id: "body-1", body: { assignmentId: "sys_pointer" } },
                {
                    id: "node-1",
                    assignment: { assignedIds: [] },
                    powerSink: {},
                },
            ],
            { "node-1": { x: 50, y: 0, radius: 0 } },
        );

        expect(resolveDraggedBodyDropTarget(snapshot, "body-1", 0, 0)).toEqual({
            valid: false,
            reason: "no_target",
        });
    });

    it("returns filter_mismatch when the target rejects the dragged body", () => {
        const snapshot = makeSnapshot(
            [
                {
                    id: "sys_pointer",
                    state: { pointer_connection_radius: { value: 40 } },
                },
                { id: "body-1", body: { assignmentId: "sys_pointer" } },
                {
                    id: "node-1",
                    assignment: {
                        assignedIds: [],
                        filter: [
                            { kind: "required_traits_all", ids: ["swift"] },
                        ],
                    },
                    powerSink: {},
                },
            ],
            { "node-1": { x: 10, y: 0, radius: 0 } },
        );

        expect(resolveDraggedBodyDropTarget(snapshot, "body-1", 0, 0)).toEqual({
            valid: false,
            reason: "filter_mismatch",
        });
    });

    it("returns slots_full when the target has no remaining slots", () => {
        const snapshot = makeSnapshot(
            [
                {
                    id: "sys_pointer",
                    state: { pointer_connection_radius: { value: 40 } },
                },
                { id: "body-1", body: { assignmentId: "sys_pointer" } },
                {
                    id: "node-1",
                    assignment: { assignedIds: ["held"], slots: 1 },
                    powerSink: {},
                },
            ],
            { "node-1": { x: 10, y: 0, radius: 0 } },
        );

        expect(resolveDraggedBodyDropTarget(snapshot, "body-1", 0, 0)).toEqual({
            valid: false,
            reason: "slots_full",
        });
    });

    it("breaks equal-distance ties by target id and rejects missing bodies", () => {
        const tied = makeSnapshot(
            [
                {
                    id: "sys_pointer",
                    state: { pointer_connection_radius: { value: 40 } },
                },
                { id: "body-1", body: { assignmentId: "sys_pointer" } },
                {
                    id: "node-b",
                    assignment: { assignedIds: [] },
                    processing: {},
                    state: { processing_outputs: { value: ["x"] } },
                },
                {
                    id: "node-a",
                    assignment: { assignedIds: [] },
                    processing: {},
                    state: { processing_outputs: { value: ["x"] } },
                },
            ],
            {
                "node-a": { x: 10, y: 0, radius: 0 },
                "node-b": { x: -10, y: 0, radius: 0 },
            },
        );

        expect(resolveDraggedBodyDropTarget(tied, "body-1", 0, 0)).toEqual({
            valid: true,
            ownerId: "node-a",
            kind: "processing",
        });
        expect(resolveDraggedBodyDropTarget(tied, "missing", 0, 0)).toEqual({
            valid: false,
            reason: "missing_body",
        });
    });
});
