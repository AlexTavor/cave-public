// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import {
    makeNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";

class ResizeObserverMock {
    observe = () => undefined;
    disconnect = () => undefined;
    unobserve = () => undefined;
}

const normalize = (value: string) => value.split(/\s+/).join("");

describe("NodeOverlayViewport guidance anchor display bounds", () => {
    beforeEach(() => {
        resetNodeOverlayDisplayBounds();
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(() => ({ width: 240, height: 180 }) as DOMRect);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        resetNodeOverlayDisplayBounds();
    });

    it("anchors bottom guidance from published renderer bounds instead of the physics fallback", async () => {
        publishNodeOverlayDisplayBounds({
            entityId: "a",
            centerX: 0,
            topY: -10,
            bottomY: 60,
        });
        const runtime = {
            ...makeNodeOverlayRuntime([], { a: makePhysicsBody("a", 0, 0) }),
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
                                slot: "bottom",
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
            expect(screen.getByTestId("runtime-guidance-callout")).toBeTruthy(),
        );
        const transform = normalize(
            globalThis.getComputedStyle(
                screen.getByTestId("runtime-guidance-callout"),
            ).transform,
        );
        expect(transform).toContain(
            "translate3d(120px,150px,0)translate(-50%,0)",
        );
    });
});
