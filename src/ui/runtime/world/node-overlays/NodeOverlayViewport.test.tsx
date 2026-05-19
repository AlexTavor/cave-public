// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import {
    makeNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import { setNodeOverlaysEnabled } from "./nodeOverlayToggle";

class ResizeObserverMock {
    observe() {
        return undefined;
    }
    disconnect() {
        return undefined;
    }
    unobserve() {
        return undefined;
    }
}

describe("NodeOverlayViewport", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(() => ({ width: 240, height: 180 }) as DOMRect);
        setNodeOverlaysEnabled(true);
    });

    afterEach(() => {
        cleanup();
        setNodeOverlaysEnabled(true);
        vi.restoreAllMocks();
    });

    it("renders pooled slots and visible overlay text when enabled", async () => {
        const runtime = makeNodeOverlayRuntime(
            [
                {
                    id: "job-1",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: { cycle: { value: 0, max: 50 } },
                    powerSink: {
                        allocatedDraw: { body: 50, mind: 0, social: 0 },
                    },
                },
                {
                    id: "store-1",
                    display: { bars: [{ key: "state.food", label: "Food" }] },
                    state: {
                        food: {
                            value: 3,
                            max: 9,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    },
                },
            ],
            {
                "job-1": makePhysicsBody("job-1", 0, 0),
                "store-1": makePhysicsBody("store-1", 20, 0),
            },
        );

        render(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{
                        runtime,
                        getCameraState: () => ({
                            centerX: 0,
                            centerY: 0,
                            zoom: 1,
                        }),
                    }}
                >
                    <NodeOverlayViewport />
                </TestWorldInteractionProvider>
            </ThemeProvider>,
        );
        await waitFor(() =>
            expect(screen.getAllByTestId("node-overlay-slot")).toHaveLength(2),
        );

        expect(
            globalThis.getComputedStyle(
                screen.getByTestId("node-overlay-viewport"),
            ).zIndex,
        ).toBe("20");
    });
});
