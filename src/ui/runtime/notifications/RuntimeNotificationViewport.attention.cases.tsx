// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalManager } from "../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { RuntimeNotificationViewport } from "./RuntimeNotificationViewport";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children, type }: any) => (
        <div data-type={type}>{children}</div>
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const world: any = { id: "sys_world", cave: { purge: { isActive: true } } };
const runtime = { getEntities: () => [], getEntity: () => world } as any;

describe("RuntimeNotificationViewport attention", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (cb) => setTimeout(() => cb(Date.now()), 0) as any,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
            clearTimeout(id as any),
        );
        runtimeNotificationStore.getState().reset();
        runtimeNotificationStore
            .getState()
            .applyEventBatch([
                { kind: "body_added", aggregationKey: "body_added", count: 1 },
            ]);
        delete world.tutorial;
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("hides the whole viewport without clearing store contents and restores it", () => {
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider value={{ runtime }}>
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        expect(screen.getByLabelText("Runtime notifications")).toBeDefined();
        world.tutorial = {
            active: true,
            attention: { hideNotifications: true },
        };
        act(() => vi.runOnlyPendingTimers());
        expect(screen.queryByLabelText("Runtime notifications")).toBeNull();
        expect(runtimeNotificationStore.getState().eventItems).toHaveLength(1);
        world.tutorial = {
            active: true,
            attention: { hideNotifications: false },
        };
        act(() => vi.runOnlyPendingTimers());
        expect(screen.getByLabelText("Runtime notifications")).toBeDefined();
        expect(screen.getByText("1 new body")).toBeDefined();
    });

    it("keeps event notifications visible during habiti announcements", () => {
        world.habitiAnnouncement = {
            active: true,
            attention: { hideNotifications: true },
        };
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider value={{ runtime }}>
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );

        expect(screen.getByLabelText("Runtime notifications")).toBeDefined();
        expect(screen.getByText("1 new body")).toBeDefined();
    });
});
