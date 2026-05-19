import { describe, expect, it } from "vitest";
import { createCartridge } from "../../engine/test/factories";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { AcknowledgeTutorialModalGuidanceHandler } from "./AcknowledgeTutorialModalGuidanceHandler";

describe("AcknowledgeTutorialModalGuidanceHandler", () => {
    it("marks the active modal guidance binding as acknowledged", () => {
        const context = makeHandlerContext(
            createCartridge("core", {
                config: {
                    settings: {
                        guidances: [
                            {
                                id: "g1",
                                presentation: "modal",
                                title: "T",
                                text: "Body",
                                imageUrl: null,
                                attention: [],
                            },
                        ],
                    },
                },
            }),
        );
        context.world.add({
            id: "sys_world",
            tutorial: {
                _tag: "tutorial",
                active: true,
                tutorialId: "intro",
                selfId: "self",
                primaryTargetId: null,
                acknowledgedModalBindingId: null,
                bindings: [
                    {
                        bindingId: "bind-1",
                        guidanceId: "g1",
                        targetId: null,
                        selfTargetId: null,
                        targetOptionId: null,
                        textOverride: null,
                    },
                ],
                attention: {
                    hideNotifications: false,
                    hideTimeControls: true,
                    pauseGame: true,
                    focusEntityIds: [],
                    ringEntityIds: [],
                    cameraFocusEntityId: null,
                    blockNonFocusedInteraction: false,
                },
            },
        } as any);

        new AcknowledgeTutorialModalGuidanceHandler().handle(
            {
                type: RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE,
                payload: { bindingId: "bind-1" },
            },
            context,
        );

        expect(
            (context.world.entities[0] as any).tutorial
                .acknowledgedModalBindingId,
        ).toBe("bind-1");
    });
});
