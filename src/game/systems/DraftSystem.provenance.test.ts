import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import { DraftSystem } from "./DraftSystem";

describe("DraftSystem provenance", () => {
    it("stamps selected draft option commands with draft provenance", () => {
        // Given
        const commands: RuntimeCommand[] = [];
        const snapshot = new Snapshot(
            [
                {
                    id: "sys_world",
                    state: { wood: { value: 1 } },
                    draft: {
                        _tag: "draft",
                        active: true,
                        poolId: "p",
                        triggerEntityId: "sys_world",
                        sourceLabel: "draft",
                        selectedOptionId: "opt",
                        pickedOneOffs: [],
                        shownCountsByPool: {},
                        cycleNumber: 0,
                        currentText: "",
                        options: [
                            {
                                id: "opt",
                                title: "t",
                                description: "d",
                                rarity: "common",
                                icon: "i",
                                payload: [
                                    {
                                        type: "MUTATE",
                                        target: "global.wood",
                                        op: "ADD",
                                        value: 2,
                                    },
                                ],
                            },
                        ],
                    },
                },
            ],
            { getBody: () => undefined } as any,
        );

        // When
        new DraftSystem().tick(
            snapshot,
            {
                enqueue: (command: RuntimeCommand) => commands.push(command),
                drain: () => [],
                clear: () => {},
                size: () => commands.length,
            } as any,
            16,
        );

        // Then
        expect(commands).toContainEqual({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: "wood", value: 3 },
            metadata: {
                sourceEntityId: "sys_world",
                sourceLane: "draft_option",
            },
        });
    });
});
