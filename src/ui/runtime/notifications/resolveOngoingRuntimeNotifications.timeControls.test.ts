import { describe, expect, it } from "vitest";
import { resolveOngoingRuntimeNotifications } from "./resolveOngoingRuntimeNotifications";

const runtimeWithExplore = () => {
    const world = {
        id: "sys_world",
        state: {
            cave_tut_throttle_seen: { value: true },
            cave_tut_time_controls_seen: { value: false },
        },
    };
    const entities = [world, { id: "explore-1", tags: ["cave_exploration"] }];
    return {
        getEntities: () => entities,
        getEntity: () => world,
    } as any;
};

describe("resolveOngoingRuntimeNotifications time controls", () => {
    it("does not surface tutorial entries for unseen tutorials", () => {
        const result = resolveOngoingRuntimeNotifications(runtimeWithExplore());
        expect(result.map((item) => item.kind)).not.toContain("tutorial");
    });

    it("keeps non-tutorial notifications stable when nothing else is active", () => {
        expect(
            resolveOngoingRuntimeNotifications(runtimeWithExplore()),
        ).toEqual([]);
    });
});
