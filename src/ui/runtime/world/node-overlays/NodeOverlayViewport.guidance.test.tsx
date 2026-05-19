// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import {
    makeNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";

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

describe("NodeOverlayViewport guidance callouts", () => {
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

    it("renders duplicate guidance uses as distinct callouts by bindingId", async () => {
        const runtime = {
            ...makeNodeOverlayRuntime([], {
                a: makePhysicsBody("a", 0, 0),
                b: makePhysicsBody("b", 20, 0),
            }),
            getEntity: () => ({
                tutorial: {
                    active: true,
                    bindings: [
                        {
                            bindingId: "intro::0",
                            guidanceId: "hint",
                            targetId: "a",
                            targetOptionId: null,
                            textOverride: null,
                        },
                        {
                            bindingId: "intro::1",
                            guidanceId: "hint",
                            targetId: "b",
                            targetOptionId: null,
                            textOverride: null,
                        },
                    ],
                    attention: {
                        hideNotifications: false,
                        hideTimeControls: false,
                        pauseGame: false,
                        focusEntityIds: [],
                        ringEntityIds: [],
                        cameraFocusEntityId: null,
                        blockNonFocusedInteraction: false,
                    },
                },
            }),
            getCartridge: () => ({
                config: {
                    settings: {
                        guidances: [
                            {
                                id: "hint",
                                presentation: "node_callout",
                                target: { kind: "entity_id", entityId: "a" },
                                slot: "top",
                                text: "Hint",
                                attention: [],
                                imageUrl: null,
                            },
                        ],
                    },
                },
            }),
        } as any;
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
            ).toHaveLength(2),
        );
    });
});
