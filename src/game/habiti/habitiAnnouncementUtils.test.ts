import { describe, expect, it } from "vitest";
import {
    acknowledgeHabitiAnnouncement,
    enqueueHabitiAnnouncement,
} from "./habitiAnnouncementUtils";

describe("habitiAnnouncementUtils", () => {
    it("queues rich announcements while a blocking overlay is active", () => {
        const world = { tutorial: { attention: { pauseGame: true } } } as any;
        enqueueHabitiAnnouncement(world, {
            habitusIds: ["alpha"],
            xpTotal: 12,
            resourceTotals: [{ resource: "ore", amount: 3 }],
        });
        expect(world.habitiAnnouncement).toMatchObject({
            active: false,
            current: null,
            queue: [
                {
                    habitusIds: ["alpha"],
                    xpTotal: 12,
                    resourceTotals: [{ resource: "ore", amount: 3 }],
                },
            ],
        });
    });

    it("acknowledges idempotently and keeps queued items blocked", () => {
        const world = {
            draft: { active: true },
            habitiAnnouncement: {
                active: true,
                current: {
                    habitusIds: ["alpha"],
                    xpTotal: 1,
                    resourceTotals: [],
                },
                queue: [
                    {
                        habitusIds: ["beta"],
                        xpTotal: 2,
                        resourceTotals: [{ resource: "wood", amount: 4 }],
                    },
                ],
            },
        } as any;
        acknowledgeHabitiAnnouncement(world);
        acknowledgeHabitiAnnouncement(world);
        expect(world.habitiAnnouncement).toMatchObject({
            active: false,
            current: null,
            queue: [
                {
                    habitusIds: ["beta"],
                    xpTotal: 2,
                    resourceTotals: [{ resource: "wood", amount: 4 }],
                },
            ],
        });
    });
});
