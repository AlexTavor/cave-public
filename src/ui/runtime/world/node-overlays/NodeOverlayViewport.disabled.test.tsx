// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import { makeNodeOverlayRuntime } from "./nodeOverlayTestUtils";
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

describe("NodeOverlayViewport disabled state", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(() => ({ width: 240, height: 180 }) as DOMRect);
        setNodeOverlaysEnabled(false);
    });

    afterEach(() => {
        cleanup();
        setNodeOverlaysEnabled(true);
        vi.restoreAllMocks();
    });

    it("renders no active overlay text when disabled", async () => {
        render(
            <ThemeProvider>
                <TestWorldInteractionProvider
                    value={{
                        runtime: makeNodeOverlayRuntime([]),
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
            expect(screen.queryByText("Next cycle")).toBeNull(),
        );
    });
});
