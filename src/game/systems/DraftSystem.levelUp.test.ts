import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { DraftSystem } from "./DraftSystem";
import { createCommandBuffer } from "./testUtils";

describe("DraftSystem level-up", () => {
    it("spends the selected level-up point from the current cave progression", () => {
        const snapshot = new Snapshot(
            [
                {
                    id: "sys_world",
                    cave: { progression: { xp: 0, level: 2, skillpoints: 1 } },
                    state: { wood: { value: 1 } },
                    draft: {
                        _tag: "draft",
                        active: true,
                        poolId: "pool_level_up",
                        triggerEntityId: "sys_world",
                        sourceLabel: "Level Up",
                        options: [
                            {
                                id: "opt",
                                title: "Body",
                                description: "",
                                rarity: "common",
                                icon: "body",
                                payload: [],
                            },
                        ],
                        selectedOptionId: "opt",
                        pickedOneOffs: [],
                        shownCountsByPool: {},
                        cycleNumber: 0,
                        currentText: "",
                    },
                },
            ],
            { getBody: () => undefined } as any,
        );
        const { commands, buffer } = createCommandBuffer();

        new DraftSystem().tick(snapshot, commands, 16);

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.UPDATE_CAVE,
            payload: { entityId: "sys_world", skillpoints: 0 },
        });
    });
});
