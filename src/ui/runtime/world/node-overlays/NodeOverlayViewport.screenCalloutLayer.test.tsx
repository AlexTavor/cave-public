// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { Modal } from "../../../lib/atoms/modal/Modal";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { TestWorldInteractionProvider } from "../testUtils";
import { NodeOverlayViewport } from "./NodeOverlayViewport";
import { makeNodeOverlayRuntime } from "./nodeOverlayTestUtils";
import { runtimeCalloutStore } from "./runtime-callouts/runtimeCalloutStore";

class ResizeObserverMock {
    observe = () => undefined;
    disconnect = () => undefined;
    unobserve = () => undefined;
}

const makeBinding = (bindingId: string, guidanceId: string) => ({
    bindingId,
    guidanceId,
    targetId: null,
    targetOptionId: null,
    textOverride: null,
});

const noAttention = {
    hideNotifications: false,
    hideTimeControls: false,
    pauseGame: false,
    focusEntityIds: [],
    ringEntityIds: [],
    cameraFocusEntityId: null,
    blockNonFocusedInteraction: false,
};

const guidance = (id: string, presentation: string, text: string) => ({
    id,
    presentation,
    text,
    attention: [],
    imageUrl: null,
});

const tutorial = {
    active: true,
    bindings: [
        makeBinding("intro::0", "screen"),
        makeBinding("intro::1", "modal"),
    ],
    attention: noAttention,
};

const guidances = [
    {
        ...guidance("screen", "screen_callout", "Screen"),
        screenSlot: "top_left",
    },
    { ...guidance("modal", "modal", "Body"), title: "Modal" },
];

const makeRuntime = () =>
    ({
        ...makeNodeOverlayRuntime([]),
        getEntity: () => ({ tutorial }),
        getCartridge: () => ({ config: { settings: { guidances } } }),
    }) as any;

const renderViewport = () =>
    render(
        <ThemeProvider>
            <PortalManager>
                <TestWorldInteractionProvider
                    value={{
                        runtime: makeRuntime(),
                        getCameraState: () => ({
                            centerX: 0,
                            centerY: 0,
                            zoom: 1,
                        }),
                    }}
                >
                    <NodeOverlayViewport />
                    <Modal isOpen>Body</Modal>
                </TestWorldInteractionProvider>
            </PortalManager>
        </ThemeProvider>,
    );

describe("NodeOverlayViewport screen callout layering", () => {
    beforeEach(() => {
        vi.stubGlobal("ResizeObserver", ResizeObserverMock);
        runtimeCalloutStore.setState({
            items: [
                {
                    id: "callout-1",
                    kind: "habitus_gained",
                    aggregationKey: "runtime",
                    count: 1,
                    text: "Runtime",
                    targetEntityId: null,
                    slot: "center",
                    expiresAtMs: 1,
                    updatedAtMs: 0,
                },
            ],
        });
        vi.spyOn(
            HTMLElement.prototype,
            "getBoundingClientRect",
        ).mockImplementation(() => ({ width: 300, height: 200 }) as DOMRect);
    });

    afterEach(() => {
        cleanup();
        runtimeCalloutStore.getState().reset();
        vi.restoreAllMocks();
    });

    it("mounts screen and runtime callouts in the callout portal above modals", async () => {
        renderViewport();
        await waitFor(() =>
            expect(
                document.querySelector(
                    "#portal-callouts [data-testid='runtime-guidance-callout']",
                ),
            ).not.toBeNull(),
        );
        expect(
            document.querySelector("#portal-overlays")?.textContent,
        ).toContain("Body");
        const callout = document.querySelector(
            "#portal-callouts [data-guidance-layer='screen']",
        );
        const runtimeCallout = document.querySelector(
            "#portal-callouts [data-testid='runtime-callout']",
        );
        expect(callout).toBeInstanceOf(HTMLElement);
        expect(runtimeCallout).toBeInstanceOf(HTMLElement);
        if (!(callout instanceof HTMLElement)) return;
        const style = globalThis.getComputedStyle(callout);
        expect(callout.dataset.guidanceSlot).toBe("top_left");
        expect(style.position).toBe("absolute");
        expect(style.top).toBe("24px");
        expect(style.left).toBe("24px");
    });
});
