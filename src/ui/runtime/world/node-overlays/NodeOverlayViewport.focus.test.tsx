// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import { makeFocusedNodeOverlayRuntime } from "./focusedNodeOverlayRuntime";

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

describe("NodeOverlayViewport tutorial focus", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(() => ({ width: 240, height: 180 }) as DOMRect);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("hides non-focused overlays and callouts", async () => {
        const runtime = makeFocusedNodeOverlayRuntime();

        render(
            <ThemeProvider>
                <PortalManager>
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
                </PortalManager>
            </ThemeProvider>,
        );

        await waitFor(() =>
            expect(
                screen.getAllByTestId("runtime-guidance-callout"),
            ).toHaveLength(1),
        );

        expect(screen.queryByText("b")).toBeNull();
    });
});
