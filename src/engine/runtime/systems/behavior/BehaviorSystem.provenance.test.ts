import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { RuntimeCommandType, type RuntimeCommand } from "../../types";
import { BehaviorSystem } from "../BehaviorSystem";

const makeBuffer = () => {
    const list: RuntimeCommand[] = [];
    return {
        list,
        commands: {
            enqueue: (command: RuntimeCommand) => list.push(command),
            drain: () => [],
            clear: () => {},
            size: () => list.length,
        } as any,
    };
};

describe("BehaviorSystem provenance", () => {
    it("stamps commands emitted by behavior rules", () => {
        // Given
        const snapshot = new Snapshot(
            [
                { id: "sys_world", state: {} },
                {
                    id: "worker",
                    state: { energy: { value: 0 } },
                    behavior: {
                        rules: [
                            {
                                id: "r",
                                sortKey: "1",
                                conditions: [],
                                actions: [
                                    {
                                        type: "MUTATE",
                                        target: "self.state.energy",
                                        op: "ADD",
                                        value: 1,
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
            { getBody: () => undefined } as any,
        );
        const { list, commands } = makeBuffer();

        // When
        new BehaviorSystem().tick(snapshot, commands, 16);

        // Then
        expect(list).toContainEqual({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: { entityId: "worker", key: "energy", delta: 1 },
            metadata: { sourceEntityId: "worker", sourceLane: "behavior_rule" },
        });
    });
});
