import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ProcessingNodeSystem } from "./ProcessingNodeSystem";
import { makeBuffer } from "./systemTestUtils";

const makeSnapshot = (progressMs: number, assignedIds = ["body-1"]) =>
    new Snapshot(
        [
            {
                id: "node-1",
                assignment: {
                    assignedIds,
                    minimums: [{ kind: "body_count", required: 2 }],
                },
                state: { assignment_duration: { value: 1000 } },
            },
            {
                id: "body-1",
                body: { assignmentId: "node-1", assignmentStatus: "orbiting" },
                state: {
                    assignment_progress_ms: { value: progressMs },
                    assignment_progress_ratio: { value: progressMs / 1000 },
                    assignment_required_ms: { value: 1000 },
                    assignment_orbit_phase_offset: { value: 0.25 },
                    assignment_orbit_radius_offset: { value: 8 },
                },
            },
            {
                id: "body-2",
                body: { assignmentId: "node-1", assignmentStatus: "orbiting" },
                state: { assignment_required_ms: { value: 1000 } },
            },
        ] as any,
        {
            getBody: (id: string) => ({
                id,
                x: id === "node-1" ? 0 : 26,
                y: 0,
                radius: id === "node-1" ? 20 : 8,
            }),
        } as any,
    );

describe("ProcessingNodeSystem", () => {
    it("does not advance progress while assignment minimums are unmet", () => {
        const commands = makeBuffer();
        new ProcessingNodeSystem().tick(makeSnapshot(900), commands, 50);

        expect(
            commands.commands.some(
                (command) =>
                    command.type === RuntimeCommandType.UPDATE_STATE &&
                    command.payload.key === "assignment_progress_ms",
            ),
        ).toBe(false);
    });

    it("resumes progress from the current value once minimums are met", () => {
        const commands = makeBuffer();
        new ProcessingNodeSystem().tick(
            makeSnapshot(500, ["body-1", "body-2"]),
            commands,
            100,
        );

        expect(commands.commands).toContainEqual({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "body-1",
                key: "assignment_progress_ms",
                value: 600,
                visible: false,
            },
        });
    });

    it("resolves at the completion step for seeded processing orbits", () => {
        const commands = makeBuffer();
        new ProcessingNodeSystem().tick(
            makeSnapshot(990, ["body-1", "body-2"]),
            commands,
            10,
        );

        expect(commands.commands).toContainEqual({
            type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
            payload: { nodeId: "node-1", bodyId: "body-1" },
        });
    });
});
