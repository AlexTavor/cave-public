import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

const makeActiveTutorial = (guidanceId: string) => ({
    _tag: "tutorial",
    active: true,
    tutorialId: "intro",
    selfId: "egg",
    primaryTargetId: "egg",
    acknowledgedModalBindingId: null,
    bindings: [
        {
            bindingId: "intro::0",
            guidanceId,
            targetId: null,
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
});

describe("HardTutorialSystem onComplete", () => {
    it("runs onComplete actions only for valid completions", () => {
        const system = new HardTutorialSystem(
            () =>
                [
                    {
                        id: "done",
                        label: "Done",
                        conditions: [
                            {
                                kind: "user_interaction",
                                interaction: "self_selected",
                            },
                        ],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "modal",
                        presentation: "modal",
                        title: "Done",
                        text: "Done",
                        attention: [],
                        imageUrl: null,
                    },
                ] as any,
            () =>
                [
                    {
                        id: "intro",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "modal" }],
                        exitConditionIds: ["done"],
                        onComplete: [
                            {
                                type: "MUTATE",
                                target: "global.tutorial_mode",
                                op: "SET",
                                value: 0,
                            },
                        ],
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
                            cave_selected_entity_id: { value: "egg" },
                            tutorial_mode: { value: 1 },
                        },
                        tutorial: makeActiveTutorial("modal"),
                        permanent: {},
                    },
                    { id: "egg" },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            commands,
            16,
        );

        expect(buffer).toContainEqual({
            type: RuntimeCommandType.SET_GLOBAL,
            payload: { key: "tutorial_mode", value: 0 },
            metadata: {
                sourceEntityId: "egg",
                sourceLane: "tutorial_on_complete",
            },
        });
    });

    it("does not run onComplete actions for invalid auto-completions", () => {
        const system = new HardTutorialSystem(
            () => [] as any,
            () => [] as any,
            () =>
                [
                    {
                        id: "intro",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "missing" }],
                        onComplete: [
                            {
                                type: "MUTATE",
                                target: "global.tutorial_mode",
                                op: "SET",
                                value: 0,
                            },
                        ],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();

        system.tick(
            new Snapshot(
                [
                    {
                        id: "sys_world",
                        tutorial: makeActiveTutorial("missing"),
                        permanent: {},
                    },
                    { id: "egg" },
                ],
                { getBody: () => undefined } as any,
                {},
            ),
            commands,
            16,
        );

        expect(
            buffer.some(
                (command) => command.type === RuntimeCommandType.SET_GLOBAL,
            ),
        ).toBe(false);
    });
});
