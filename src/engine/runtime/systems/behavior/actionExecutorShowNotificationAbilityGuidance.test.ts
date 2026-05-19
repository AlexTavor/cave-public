import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../types";
import { createCommandBuffer } from "./actionExecutorTestUtils";
import { executeShowNotificationAbilityGuidanceAction } from "./actionExecutorShowNotificationAbilityGuidance";

describe("executeShowNotificationAbilityGuidanceAction", () => {
    it("enqueues a notification ability guidance command", () => {
        const { buffer, commands } = createCommandBuffer();

        executeShowNotificationAbilityGuidanceAction(
            {
                type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE",
                abilityId: "notif-1",
                title: "Alert",
                text: "Done.",
                imageUrl: null,
            },
            commands,
        );

        expect(buffer).toEqual([
            {
                type: RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
                payload: {
                    abilityId: "notif-1",
                    title: "Alert",
                    text: "Done.",
                    imageUrl: null,
                },
            },
        ]);
    });
});
