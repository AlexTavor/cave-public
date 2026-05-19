import { describe, expect, it } from "vitest";
import { DraftSystem } from "./DraftSystem";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { createCommandBuffer } from "./testUtils";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";
import { RuntimeCommandType } from "../../engine/runtime/types";

const makeDraft = (
    overrides: Partial<DraftComponent> = {},
): DraftComponent => ({
    _tag: "draft",
    active: true,
    poolId: "pool",
    triggerEntityId: "sys_world",
    sourceLabel: "Level Up",
    options: [],
    selectedOptionId: null,
    pickedOneOffs: [],
    shownCountsByPool: {},
    cycleNumber: 0,
    currentText: "",
    ...overrides,
});

describe("DraftSystem", () => {
    it("executes the selected option and clears the draft", () => {
        const draft = makeDraft({
            options: [
                {
                    id: "opt-1",
                    title: "Gain wood",
                    description: "Add 2 wood",
                    rarity: "common",
                    icon: "wood",
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
            selectedOptionId: "opt-1",
        });

        const entities = [
            {
                id: "sys_world",
                state: { wood: { value: 1 } },
                draft,
            },
        ];

        const snapshot = new Snapshot(entities, {
            getBody: () => undefined,
        } as any);
        const { commands, buffer } = createCommandBuffer();
        const system = new DraftSystem();

        system.tick(snapshot, commands, 16);

        expect(buffer).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: RuntimeCommandType.SET_GLOBAL,
                    payload: { key: "wood", value: 3 },
                    metadata: {
                        sourceEntityId: "sys_world",
                        sourceLane: "draft_option",
                    },
                }),
                {
                    type: RuntimeCommandType.CLEAR_DRAFT,
                    payload: {},
                },
            ]),
        );
    });

    it("clears draft when trigger entity is missing", () => {
        const draft = makeDraft({
            triggerEntityId: "missing",
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
        });

        const snapshot = new Snapshot([{ id: "sys_world", state: {}, draft }], {
            getBody: () => undefined,
        } as any);
        const { commands, buffer } = createCommandBuffer();

        new DraftSystem().tick(snapshot, commands, 16);

        expect(buffer).toEqual([
            { type: RuntimeCommandType.CLEAR_DRAFT, payload: {} },
        ]);
    });
});

