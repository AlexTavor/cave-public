import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { HardTutorialSystem } from "./HardTutorialSystem";
import { createCommandBuffer } from "./testUtils";

const makeSnapshot = (world: any, entities: any[] = []) =>
    new Snapshot([world, ...entities], { getBody: () => undefined } as any, {});

describe("HardTutorialSystem", () => {
    it("keeps the active tutorial when it has not completed", () => {
        const world = {
            id: "sys_world",
            state: { cave_selected_entity_id: { value: "other" } },
            tutorial: {
                _tag: "tutorial",
                active: true,
                tutorialId: "intro",
                selfId: "egg",
                primaryTargetId: "other",
                bindings: [
                    {
                        bindingId: "intro::0",
                        guidanceId: "node",
                        targetId: "egg",
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
        };
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
                        id: "node",
                        presentation: "node_callout",
                        target: { kind: "entity_id", entityId: "egg" },
                        slot: "top",
                        text: "Node",
                        attention: [],
                    },
                ] as any,
            () =>
                [
                    {
                        id: "intro",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "node" }],
                        exitConditionIds: ["done"],
                    },
                    {
                        id: "next",
                        selfDefinition: { kind: "auto" },
                        guidances: [{ guidanceId: "node" }],
                    },
                ] as any,
        );
        const { buffer, commands } = createCommandBuffer();
        system.tick(
            makeSnapshot(world, [{ id: "egg" }, { id: "other" }]),
            commands,
            16,
        );
        expect(buffer).toHaveLength(1);
        expect(buffer[0] as any).toMatchObject({
            type: RuntimeCommandType.SET_TUTORIAL_STATE,
            payload: { tutorial: { tutorialId: "intro" } },
        });
    });
});
