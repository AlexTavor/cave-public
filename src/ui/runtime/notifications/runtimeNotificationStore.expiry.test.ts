import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RUNTIME_EVENT_NOTIFICATION_TTL_MS } from "./constants";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

describe("runtimeNotificationStore expiry scheduling", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        runtimeNotificationStore.getState().reset();
    });

    afterEach(() => vi.useRealTimers());

    it("auto-removes expired events and refreshes extended expiries", () => {
        runtimeNotificationStore
            .getState()
            .applyEventBatch(
                [
                    {
                        kind: "body_added",
                        aggregationKey: "body_added",
                        count: 1,
                    },
                ],
                1000,
            );
        runtimeNotificationStore
            .getState()
            .applyEventBatch(
                [
                    {
                        kind: "body_added",
                        aggregationKey: "body_added",
                        count: 1,
                    },
                ],
                1500,
            );

        act(() =>
            vi.setSystemTime(1500 + RUNTIME_EVENT_NOTIFICATION_TTL_MS - 1),
        );
        expect(runtimeNotificationStore.getState().eventItems).toHaveLength(1);
        act(() => vi.advanceTimersByTime(1));
        expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
    });

    it("reschedules after dismissing the nearest expiry while another item remains", () => {
        runtimeNotificationStore
            .getState()
            .applyEventBatch(
                [{ kind: "body_added", aggregationKey: "first", count: 1 }],
                1000,
            );
        runtimeNotificationStore
            .getState()
            .applyEventBatch(
                [{ kind: "body_died", aggregationKey: "second", count: 1 }],
                2000,
            );
        runtimeNotificationStore.getState().dismissEvent("first");

        act(() => vi.setSystemTime(2000 + RUNTIME_EVENT_NOTIFICATION_TTL_MS));
        act(() => vi.advanceTimersByTime(1));
        expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
    });
});
