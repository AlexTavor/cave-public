import { describe, expect, it } from "vitest";
import { makeHandlerContext } from "../../engine/runtime/handlers/handlerTestUtils";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { ShowNotificationAbilityGuidanceHandler } from "./ShowNotificationAbilityGuidanceHandler";

describe("ShowNotificationAbilityGuidanceHandler", () => {
    it("writes the active notification ability guidance to sys_world", () => {
        const context = makeHandlerContext();
        context.world.add({ id: "sys_world" } as any);

        new ShowNotificationAbilityGuidanceHandler().handle(
            {
                type: RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
                payload: {
                    abilityId: "notif",
                    title: "Title",
                    text: "Text",
                    imageUrl: null,
                },
            },
            context,
        );

        expect(
            (context.world.entities[0] as any).notificationAbilityGuidance
                .current,
        ).toMatchObject({
            abilityId: "notif",
            title: "Title",
        });
    });
});
