import { describe, expect, it } from "vitest";
import {
    acknowledgeNotificationAbilityGuidance,
    enqueueNotificationAbilityGuidance,
} from "./notificationAbilityGuidanceUtils";

describe("notificationAbilityGuidanceUtils", () => {
    it("activates the first item and queues later items", () => {
        const world = { id: "sys_world" } as any;

        enqueueNotificationAbilityGuidance(world, {
            abilityId: "a1",
            title: "First",
            text: "One",
            imageUrl: null,
        });
        enqueueNotificationAbilityGuidance(world, {
            abilityId: "a2",
            title: "Second",
            text: "Two",
            imageUrl: null,
        });

        expect(world.notificationAbilityGuidance.current.abilityId).toBe("a1");
        expect(world.notificationAbilityGuidance.queue).toHaveLength(1);
    });

    it("advances queued items and clears when empty", () => {
        const world = {
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
        } as any;

        acknowledgeNotificationAbilityGuidance(world);
        expect(world.notificationAbilityGuidance.current.abilityId).toBe("a2");
        acknowledgeNotificationAbilityGuidance(world);
        expect(world.notificationAbilityGuidance.active).toBe(false);
        expect(world.notificationAbilityGuidance.current).toBeNull();
    });
});
