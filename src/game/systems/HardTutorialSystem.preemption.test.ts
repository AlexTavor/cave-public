import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

describe("HardTutorialSystem draft tutorial preemption", () => {
    it("promotes an eligible draft tutorial over a continuing tutorial", () => {
        const system = new HardTutorialSystem(
            () =>
                [
                    {
                        id: "draft_open",
                        label: "Draft Open",
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "draft_opened",
                                factAbout: "pool_explore",
                                operator: ">=",
                                value: 1,
                            },
                        ],
                    },
                    {
                        id: "self_unselected",
                        label: "Self Unselected",
                        conditions: [
                            {
                                kind: "user_interaction",
                                interaction: "self_unselected",
                            },
                        ],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "node",
                        presentation: "node_callout",
                        target: { kind: "entity_id", entityId: "sys_world" },
                        slot: "top",
                        text: "Node",
                        attention: [],
                    },
                    {
                        id: "draft",
                        presentation: "draft_guidance",
                        targetOptionId: "foraging_option",
                        attention: [],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "draft_tut",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        enterConditionIds: ["draft_open"],
                        guidances: [{ guidanceId: "draft" }],
                    },
                    {
                        id: "intro_1",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        guidances: [{ guidanceId: "node" }],
                        exitConditionIds: ["self_unselected"],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();

        system.tick(
            new Snapshot(
                [
                    {
                        id: "sys_world",
                        state: {
                            cave_selected_entity_id: { value: "sys_world" },
                        },
                        run: { draft_opened: { pool_explore: 1 } },
                        tutorial: {
                            _tag: "tutorial",
                            active: true,
                            tutorialId: "intro_1",
                            selfId: "sys_world",
                            primaryTargetId: "sys_world",
                            bindings: [
                                {
                                    bindingId: "intro_1::0",
                                    guidanceId: "node",
                                    targetId: "sys_world",
                                    selfTargetId: "sys_world",
                                    targetOptionId: null,
                                    textOverride: null,
                                },
                            ],
                            attention: {
                                hideNotifications: false,
                                hideTimeControls: false,
                                pauseGame: false,
                                focusEntityIds: [],
                                ringEntityIds: [],
                                cameraFocusEntityId: null,
                                blockNonFocusedInteraction: false,
                            },
                        },
                    },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            commands,
            16,
        );

        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "draft_tut" } },
        });
    });
});
