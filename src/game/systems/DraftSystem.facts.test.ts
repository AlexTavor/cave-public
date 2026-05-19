import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { DraftSystem } from "./DraftSystem";
import { createCommandBuffer } from "./testUtils";

describe("DraftSystem draft facts", () => {
    it("emits draft_completed on successful execution", () => {
        const draft = {
            _tag: "draft",
            active: true,
            poolId: "pool",
            triggerEntityId: "sys_world",
            sourceLabel: "Level Up",
            options: [
                {
                    id: "opt-1",
                    title: "Gain wood",
                    description: "Add 2 wood",
                    rarity: "common",
                    icon: "wood",
                    payload: [],
                },
            ],
            selectedOptionId: "opt-1",
            pickedOneOffs: [],
            shownCountsByPool: {},
            cycleNumber: 0,
            currentText: "",
        };
        const snapshot = new Snapshot([{ id: "sys_world", state: {}, draft }], {
            getBody: () => undefined,
        } as any);
        const { commands, buffer } = createCommandBuffer();

        new DraftSystem().tick(snapshot, commands, 16);

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.ADJUST_FACT,
            payload: {
                scope: "run",
                factType: "draft_completed",
                factAbout: "opt-1",
                delta: 1,
            },
        });
    });

    it("does not emit draft_completed when the selected option is missing", () => {
        const snapshot = new Snapshot(
            [
                {
                    id: "sys_world",
                    draft: { selectedOptionId: "missing", options: [] },
                },
            ],
            {
                getBody: () => undefined,
            } as any,
        );
        const { commands, buffer } = createCommandBuffer();

        new DraftSystem().tick(snapshot, commands, 16);

        expect(buffer).toEqual([
            { type: RuntimeCommandType.CLEAR_DRAFT, payload: {} },
        ]);
    });
});
