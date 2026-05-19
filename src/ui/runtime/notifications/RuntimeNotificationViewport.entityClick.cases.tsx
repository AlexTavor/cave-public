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
import { RuntimeNotificationViewport } from "./RuntimeNotificationViewport";
import { runtimeNotificationStore } from "./runtimeNotificationStore";

vi.mock("../../lib/atoms/animatable/Animatable", () => ({
    Animatable: ({ children }: any) => children,
    AnimatePresence: ({ children }: any) => children,
}));

const runtime = {
    getEntities: () => [],
    getEntity: (id: string) =>
        id === "ore-1"
            ? { id: "ore-1", display: { label: "Ore Vein" } }
            : {
                  id: "sys_world",
                  cave: { purge: { isActive: false } },
                  state: { cave_tut_throttle_seen: { value: true } },
              },
    getPhysicsBody: () => ({ position: { x: 33, y: 44 }, x: 33, y: 44 }),
};

const renderViewport = (kind: "entity_discovered" | "entity_unlocked") => {
    const selectEntity = vi.fn();
    const setCameraState = vi.fn();
    runtimeNotificationStore.getState().applyEventBatch([
        {
            kind,
            aggregationKey: `${kind}:ore vein`,
            count: 1,
            entityId: "ore-1",
            entityLabel: "Ore Vein",
        },
    ]);
    render(
        <ThemeProvider>
            <PortalManager>
                <TestWorldInteractionProvider
                    value={{
                        runtime: runtime as any,
                        selectEntity,
                        setCameraState,
                        getCameraState: () => ({
                            centerX: 0,
                            centerY: 0,
                            zoom: 1.5,
                        }),
                    }}
                >
                    <RuntimeNotificationViewport />
                </TestWorldInteractionProvider>
            </PortalManager>
        </ThemeProvider>,
    );
    act(() => vi.advanceTimersByTime(100));
    return { selectEntity, setCameraState };
};

describe("RuntimeNotificationViewport entity click", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        runtimeNotificationStore.getState().reset();
    });
    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it.each([
        ["entity_discovered", "Ore Vein discovered"],
        ["entity_unlocked", "Ore Vein unlocked"],
    ] as const)(
        "selects, focuses, and dismisses on %s clicks",
        (kind, text) => {
            const { selectEntity, setCameraState } = renderViewport(kind);

            fireEvent.click(screen.getByText(text));

            expect(selectEntity).toHaveBeenCalledWith("ore-1");
            expect(setCameraState).toHaveBeenCalledWith({
                centerX: 33,
                centerY: 44,
                zoom: 1.5,
            });
            expect(runtimeNotificationStore.getState().eventItems).toEqual([]);
        },
    );
});
