import { describe, expect, it } from "vitest";
import { PowerAssignmentSystem } from "./PowerAssignmentSystem";
import { makeBuffer, makeSnapshot } from "./systemTestUtils";

describe("PowerAssignmentSystem", () => {
    it("skips hidden conditional-activation sinks when sharing throttle", () => {
        const commands = makeBuffer();
        new PowerAssignmentSystem().tick(
            makeSnapshot([
                {
                    id: "active",
                    assignment: { assignedIds: ["body-1"] },
                    powerSink: { throttle: 0.5 },
                } as any,
                {
                    id: "hidden",
                    assignment: { assignedIds: ["body-2"] },
                    powerSink: { throttle: 0 },
                    state: {
                        conditional_activation_cycle_hide_throttle: {
                            value: 1,
                        },
                    },
                } as any,
            ]),
            commands,
        );

        expect(commands.commands).toEqual([
            {
                type: "UPDATE_POWER_SINK",
                payload: { entityId: "active", throttle: 1 },
            },
        ]);
    });
    it("syncs saved throttle for visible conditional-activation assignment sinks", () => {
        const commands = makeBuffer();

        new PowerAssignmentSystem().tick(
            makeSnapshot([
                {
                    id: "actor",
                    assignment: { assignedIds: ["body-1"] },
                    powerSink: { throttle: 1 },
                    state: {
                        conditional_activation_cycle_hide_throttle: {
                            value: 0,
                        },
                        conditional_activation_cycle_saved_throttle: {
                            value: 0,
                        },
                    },
                } as any,
            ]),
            commands,
        );

        expect(commands.commands).toEqual([
            {
                type: "UPDATE_STATE",
                payload: {
                    entityId: "actor",
                    key: "conditional_activation_cycle_saved_throttle",
                    value: 1,
                    visible: false,
                },
            },
        ]);
    });
});
