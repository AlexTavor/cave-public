// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RUNTIME_EVENT_NOTIFICATION_TTL_MS } from "./constants";
import { RuntimeNotificationViewport } from "./RuntimeNotificationViewport";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children }: any) => children,
    AnimatePresence: ({ children }: any) => children,
}));

const runtime = {
    getEntities: () => [
        { id: "body-1", body: {}, traits: ["starving"] },
        { id: "body-2", body: {}, traits: ["cold"] },
        { id: "explore-1", blueprintId: "explore", tags: ["cave_exploration"] },
    ],
    getEntity: () => ({
        id: "sys_world",
        cave: { purge: { isActive: true } },
        state: { cave_tut_throttle_seen: { value: false } },
    }),
};
const worldValue = { runtime: runtime as any };

describe("RuntimeNotificationViewport events", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        runtimeNotificationStore.getState().reset();
    });
    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it("renders ongoing and event notifications together and dismisses events", () => {
        runtimeNotificationStore.getState().applyEventBatch(
            [
                {
                    kind: "body_added",
                    aggregationKey: "body_added",
                    count: 1,
                },
            ],
            Date.now(),
        );
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider value={worldValue}>
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        act(() => vi.advanceTimersByTime(100));

        expect(
            screen.getByLabelText("Ongoing runtime notifications"),
        ).toBeTruthy();
        expect(
            screen.getByLabelText("Event runtime notifications"),
        ).toBeTruthy();
        expect(
            screen.getByText("The Purge is on").closest('[data-tone="purge"]'),
        ).not.toBeNull();
        expect(
            screen
                .getByText("1 new body")
                .closest('[data-card="runtime-notification"]'),
        ).not.toBeNull();
        expect(screen.queryByText(/Auto-dismiss/i)).toBeNull();
        fireEvent.click(screen.getByText("1 new body"));
        expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
    });

    it("auto-dismisses expired event notifications without showing countdown text", () => {
        runtimeNotificationStore.getState().applyEventBatch(
            [
                {
                    kind: "body_added",
                    aggregationKey: "body_added",
                    count: 1,
                },
            ],
            Date.now(),
        );
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider value={worldValue}>
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );

        act(() => vi.advanceTimersByTime(1000));
        expect(screen.queryByText(/Auto-dismiss/i)).toBeNull();

        act(() => vi.advanceTimersByTime(RUNTIME_EVENT_NOTIFICATION_TTL_MS));
        expect(screen.queryByText("1 new body")).toBeNull();
    });
});
