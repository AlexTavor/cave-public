// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { TestWorldInteractionProvider } from "../testUtils";
import {
    createMutableNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import * as overlayViewportModels from "./overlayViewportModels";
import { runtimeCalloutStore } from "./runtime-callouts/runtimeCalloutStore";
import { useNodeOverlayAuxiliaryData } from "./useNodeOverlayAuxiliaryData";
import { useNodeOverlayViewportInputs } from "./useNodeOverlayViewportInputs";

const makeRootRef = (): RefObject<HTMLElement | null> => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: 240 });
    Object.defineProperty(element, "clientHeight", { value: 180 });
    Object.defineProperty(element, "getBoundingClientRect", {
        value: () => ({ width: 240, height: 180 }),
    });
    return { current: element } as RefObject<HTMLElement | null>;
};

describe("useNodeOverlayAuxiliaryData display bounds revision", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());
    afterEach(() => runtimeCalloutStore.getState().reset());

    it("recomputes only for tracked guidance and runtime-callout targets", () => {
        runtimeCalloutStore.setState({
            items: [
                {
                    id: "callout",
                    kind: "habitus_gained",
                    aggregationKey: "a",
                    count: 1,
                    text: "Hit",
                    targetEntityId: "a",
                    slot: "top",
                    updatedAtMs: 1,
                    expiresAtMs: 2,
                },
            ],
        });
        const runtime = createMutableNodeOverlayRuntime([], {
            a: makePhysicsBody("a", 0, 0),
            sys_world: makePhysicsBody("sys_world", 10, 10),
        });
        const spy = vi.spyOn(
            overlayViewportModels,
            "resolveRuntimeCalloutModels",
        );
        const { result } = renderHook(
            () =>
                useNodeOverlayAuxiliaryData(
                    useNodeOverlayViewportInputs(makeRootRef()),
                    true,
                ),
            {
                wrapper: ({ children }) => (
                    <TestWorldInteractionProvider
                        value={{
                            runtime: runtime.runtime,
                            getCameraState: () => ({
                                centerX: 0,
                                centerY: 0,
                                zoom: 1,
                            }),
                        }}
                    >
                        {children}
                    </TestWorldInteractionProvider>
                ),
            },
        );
        const first = result.current;

        spy.mockClear();
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "sys_world",
                centerX: 10,
                topY: 0,
                bottomY: 20,
            }),
        );
        expect(spy).not.toHaveBeenCalled();
        expect(result.current).toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 20,
                topY: -10,
                bottomY: 10,
            }),
        );
        expect(spy.mock.calls.length).toBeGreaterThan(0);
    });
});
