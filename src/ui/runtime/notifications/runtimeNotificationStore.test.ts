import { beforeEach, describe, expect, it } from "vitest";
import { RUNTIME_EVENT_NOTIFICATION_TTL_MS } from "./constants";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

describe("runtimeNotificationStore", () => {
    beforeEach(() => runtimeNotificationStore.getState().reset());

    it("aggregates matching events and refreshes expiry", () => {
        const store = runtimeNotificationStore.getState();
        store.applyEventBatch(
            [{ kind: "body_added", aggregationKey: "body_added", count: 1 }],
            1000,
        );
        store.applyEventBatch(
            [{ kind: "body_added", aggregationKey: "body_added", count: 2 }],
            1500,
        );
        const [item] = runtimeNotificationStore.getState().eventItems;

        expect(item.count).toBe(3);
        expect(item.expiresAtMs).toBe(1500 + RUNTIME_EVENT_NOTIFICATION_TTL_MS);
    });

    it("keeps distinct aggregation keys separate and supports dismissal and reset", () => {
        const store = runtimeNotificationStore.getState();
        store.applyEventBatch(
            [
                {
                    kind: "body_level_up",
                    aggregationKey: "body_level_up:2",
                    count: 1,
                    level: 2,
                },
                {
                    kind: "entity_discovered",
                    aggregationKey: "entity_discovered:ore",
                    count: 1,
                    entityLabel: "Ore",
                },
            ],
            1000,
        );
        expect(runtimeNotificationStore.getState().eventItems).toHaveLength(2);
        runtimeNotificationStore.getState().dismissEvent("body_level_up:2");
        expect(runtimeNotificationStore.getState().eventItems).toHaveLength(1);
        runtimeNotificationStore.getState().reset();
        expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
    });
});
