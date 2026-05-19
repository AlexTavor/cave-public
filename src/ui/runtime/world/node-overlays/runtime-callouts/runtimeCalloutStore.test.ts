import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeCalloutStore } from "./runtimeCalloutStore";

afterEach(() => {
    runtimeCalloutStore.getState().reset();
    vi.useRealTimers();
});

describe("runtimeCalloutStore", () => {
    it("aggregates matching inputs and expires them on the scheduled timeout", () => {
        vi.useFakeTimers();
        runtimeCalloutStore.getState().applyBatch(
            [
                {
                    kind: "habitus_gained",
                    aggregationKey: "a",
                    text: "Gain",
                    count: 1,
                    slot: "top",
                    targetEntityId: null,
                },
                {
                    kind: "habitus_gained",
                    aggregationKey: "a",
                    text: "Gain",
                    count: 2,
                    slot: "top",
                    targetEntityId: null,
                },
            ],
            100,
        );

        expect(runtimeCalloutStore.getState().items).toHaveLength(1);
        expect(runtimeCalloutStore.getState().items[0]?.count).toBe(3);

        vi.setSystemTime(3000);
        vi.runOnlyPendingTimers();

        expect(runtimeCalloutStore.getState().items).toHaveLength(0);
    });

    it("clears items and the scheduled timeout on reset", () => {
        vi.useFakeTimers();
        runtimeCalloutStore
            .getState()
            .applyBatch(
                [
                    {
                        kind: "habitus_gained",
                        aggregationKey: "a",
                        text: "Gain",
                        count: 1,
                        slot: "top",
                        targetEntityId: null,
                    },
                ],
                100,
            );

        runtimeCalloutStore.getState().reset();
        vi.runOnlyPendingTimers();

        expect(runtimeCalloutStore.getState().items).toHaveLength(0);
    });
});
