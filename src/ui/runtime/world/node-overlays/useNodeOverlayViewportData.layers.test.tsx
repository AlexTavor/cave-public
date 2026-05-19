// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { ReactNode, RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { TestWorldInteractionProvider } from "../testUtils";
import {
    createMutableNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import { runtimeCalloutStore } from "./runtime-callouts/runtimeCalloutStore";
import { useNodeOverlayViewportData } from "./useNodeOverlayViewportData";

const makeRootRef = () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: 240 });
    Object.defineProperty(element, "clientHeight", { value: 180 });
    Object.defineProperty(element, "getBoundingClientRect", {
        value: () => ({ width: 240, height: 180 }),
    });
    return { current: element } as RefObject<HTMLElement | null>;
};

const makeRuntime = () =>
    createMutableNodeOverlayRuntime(
        [
            {
                id: "store-1",
                display: {
                    bars: [
                        {
                            key: "state.food",
                            maxKey: "state.food.max",
                            label: "Food",
                        },
                    ],
                },
                state: {
                    food: {
                        value: 3,
                        max: 9,
                        allowDeposit: true,
                        allowWithdraw: true,
                        priority: 1,
                    },
                },
            },
        ],
        {
            "store-1": makePhysicsBody("store-1", 0, 0),
            sys_world: makePhysicsBody("sys_world", 10, 10),
        },
    );

const wrapper =
    (runtime: ReturnType<typeof makeRuntime>) =>
    ({ children }: { children: ReactNode }) => (
        <TestWorldInteractionProvider
            value={{
                runtime: runtime.runtime,
                getCameraState: () => ({ centerX: 0, centerY: 0, zoom: 1 }),
            }}
        >
            {children}
        </TestWorldInteractionProvider>
    );

const renderAuxiliary = (runtime: ReturnType<typeof makeRuntime>) =>
    renderHook(() => useNodeOverlayViewportData(makeRootRef(), true), {
        wrapper: wrapper(runtime),
    });

describe("useNodeOverlayViewportData layers", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());
    afterEach(() => runtimeCalloutStore.getState().reset());

    it("keeps returning the full overlay viewport data contract", () => {
        const runtime = makeRuntime();
        const { result } = renderAuxiliary(runtime);
        expect(result.current.nodeModels).toHaveLength(1);
        expect(result.current.caveStatusPosition).toEqual({ x: 130, y: 90 });
    });

    it("updates cave status without churning shared auxiliary refs", () => {
        const runtime = makeRuntime();
        const { result } = renderAuxiliary(runtime);
        const first = result.current;
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "sys_world",
                centerX: 20,
                topY: 0,
                bottomY: 20,
            }),
        );
        expect(result.current.guidanceModels).toBe(first.guidanceModels);
        expect(result.current.runtimeCalloutModels).toBe(
            first.runtimeCalloutModels,
        );
        expect(result.current.screenGuidanceModels).toBe(
            first.screenGuidanceModels,
        );
        expect(result.current.caveStatusPosition).toEqual({ x: 140, y: 90 });
    });
});
