// @vitest-environment jsdom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
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

const world = {
    id: "sys_world",
    cave: { purge: { isActive: true } },
    state: { purge_progress: { value: 40 } },
};
const makeRuntime = () => ({
    commands: { enqueue: vi.fn() },
    flushCommands: vi.fn(),
    getState: () => ({ status: "paused" }),
    getEntities: () => [world],
    getEntity: () => world,
    getCartridge: () => ({
        config: {
            settings: {
                guidances: [
                    {
                        id: "ongoing_suspicion",
                        presentation: "modal",
                        title: "Suspicion",
                        text: "Watch the heat.",
                        imageUrl: null,
                    },
                ],
                game_config: {
                    suspicionNotificationDisplays: [
                        { text: "High", color: "#ff0000", threshold: 0 },
                    ],
                },
            },
        },
    }),
});

describe("RuntimeNotificationViewport ongoing click", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        runtimeNotificationStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("opens authored modal guidance when an ongoing card is clicked", () => {
        const runtime = makeRuntime();
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider
                        value={{ runtime: runtime as any }}
                    >
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        act(() => vi.advanceTimersByTime(100));
        fireEvent.click(screen.getByText("Suspicion:"));
        expect(runtime.commands.enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
            payload: {
                abilityId: "ongoing_suspicion",
                title: "Suspicion",
                text: "Watch the heat.",
                imageUrl: null,
            },
        });
        expect(runtime.flushCommands).toHaveBeenCalled();
    });

    it("renders transient events newest-first with slideDown animation", () => {
        const now = Date.now();
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
                now,
            );
        runtimeNotificationStore
            .getState()
            .applyEventBatch(
                [{ kind: "body_died", aggregationKey: "body_died", count: 1 }],
                now + 100,
            );
        render(
            <ThemeProvider>
                <PortalManager>
                    <TestWorldInteractionProvider
                        value={{ runtime: makeRuntime() as any }}
                    >
                        <RuntimeNotificationViewport />
                    </TestWorldInteractionProvider>
                </PortalManager>
            </ThemeProvider>,
        );
        act(() => vi.advanceTimersByTime(100));
        const eventList = screen.getByLabelText("Event runtime notifications");
        const newest = screen.getByText("1 body died");
        const older = screen.getByText("1 new body");
        expect(newest.compareDocumentPosition(older)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
        expect(
            Array.from(eventList.querySelectorAll("[data-type]")).every(
                (node) => (node as HTMLElement).dataset.type === "slideDown",
            ),
        ).toBe(true);
    });
});
