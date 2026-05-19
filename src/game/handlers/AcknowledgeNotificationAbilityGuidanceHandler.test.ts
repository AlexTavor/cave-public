import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { AcknowledgeNotificationAbilityGuidanceHandler } from "./AcknowledgeNotificationAbilityGuidanceHandler";

describe("AcknowledgeNotificationAbilityGuidanceHandler", () => {
    it("advances the notification ability queue", () => {
        const context = makeHandlerContext();
        context.world.add({
            id: "sys_world",
            notificationAbilityGuidance: {
                _tag: "notification_ability_guidance",
                active: true,
                current: {
                    abilityId: "a1",
                    title: "A",
                    text: "A",
                    imageUrl: null,
                },
                queue: [
                    { abilityId: "a2", title: "B", text: "B", imageUrl: null },
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

        new AcknowledgeNotificationAbilityGuidanceHandler().handle(
            {
                type: RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE,
                payload: {},
            },
            context,
        );

        expect(
            (context.world.entities[0] as any).notificationAbilityGuidance
                .current.abilityId,
        ).toBe("a2");
    });
});
