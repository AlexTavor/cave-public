import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { collectPointerTargets } from "./pointerState";

describe("collectPointerTargets conditional activation", () => {
    it("skips nodes whose assignment or cycle target is conditionally inactive", () => {
        const snapshot = new Snapshot(
            [
                {
                    id: "node-1",
                    blueprintId: "node",
                    assignment: { assignedIds: [] },
                    powerSink: { baseDemand: { body: 1 } },
                    state: { conditional_activation_active: { value: 0 } },
                },
            ] as any,
            { getBody: () => ({ x: 4, y: 9 }) } as any,
            {
                node: {
                    _editor: {
                        abilities: {
                            assignment: {},
                            conditionalActivation: {
                                targets: [{ ability: "assignment" }],
                            },
                        },
                    },
                } as any,
            },
        );

        expect(collectPointerTargets(snapshot)).toEqual([]);
    });
});
