import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

describe("HardTutorialSystem activation", () => {
    it("allows a later eligible tutorial to replace a continuing active tutorial", () => {
        const system = new HardTutorialSystem(
            () =>
                [
                    {
                        id: "stay_active",
                        label: "Stay Active",
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "keep_intro",
                                factAbout: "intro",
                                operator: ">=",
                                value: 1,
                            },
                        ],
                    },
                    {
                        id: "can_absorb_safely",
                        label: "Can Absorb Safely",
                        conditions: [
                            {
                                kind: "fact_threshold",
                                scope: "run",
                                factType: "can_absorb_safely",
                                factAbout: "pool",
                                operator: ">=",
                                value: 1,
                            },
                        ],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "modal",
                        presentation: "modal",
                        title: "Ready",
                        text: "Body",
                        attention: [],
                        imageUrl: null,
                    },
                ] as any,
            () =>
                [
                    {
                        id: "intro",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        exitConditionIds: ["stay_active"],
                        guidances: [{ guidanceId: "modal" }],
                    },
                    {
                        id: "absorption_tut_0",
                        selfDefinition: {
                            kind: "entity_id",
                            entityId: "sys_world",
                        },
                        enterConditionIds: ["can_absorb_safely"],
                        guidances: [{ guidanceId: "modal" }],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();

        system.tick(
            new Snapshot(
                [
                    {
                        id: "sys_world",
                        state: { population: { value: 1 } },
                        run: { can_absorb_safely: { pool: 1 } },
                        permanent: {},
                        tutorial: {
                            _tag: "tutorial",
                            active: true,
                            tutorialId: "intro",
                            selfId: "sys_world",
                            primaryTargetId: null,
                            bindings: [
                                {
                                    bindingId: "modal",
                                    guidanceId: "modal",
                                    targetId: null,
                                    selfTargetId: null,
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

        expect(buffer).toHaveLength(1);
        expect(buffer[0]).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "absorption_tut_0" } },
        });
    });
});
