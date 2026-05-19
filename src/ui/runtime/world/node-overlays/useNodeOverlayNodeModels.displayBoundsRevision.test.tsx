// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { TestWorldInteractionProvider } from "../testUtils";
import {
    createMutableNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import * as viewportModelModule from "./overlayViewportModels";
import { useNodeOverlayNodeModels } from "./useNodeOverlayNodeModels";

const makeRootRef = (): RefObject<HTMLElement | null> => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: 240 });
    Object.defineProperty(element, "clientHeight", { value: 180 });
    Object.defineProperty(element, "getBoundingClientRect", {
        value: () => ({ width: 240, height: 180 }),
    });
    return { current: element } as RefObject<HTMLElement | null>;
};

describe("useNodeOverlayNodeModels display bounds revision", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("ignores unrelated bounds updates and recomputes tracked ones", () => {
        const runtime = createMutableNodeOverlayRuntime(
            [
                {
                    id: "a",
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
            { a: makePhysicsBody("a", 0, 0) },
        );
        const spy = vi.spyOn(viewportModelModule, "projectNodeOverlayModels");
        const { result } = renderHook(
            () => useNodeOverlayNodeModels(makeRootRef(), true),
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
                entityId: "b",
                centerX: 0,
                topY: -10,
                bottomY: 10,
            }),
        );
        expect(spy).not.toHaveBeenCalled();
        expect(result.current).toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 0,
                topY: -10,
                bottomY: 10,
            }),
        );
        expect(spy.mock.calls.length).toBeGreaterThan(0);
        expect(result.current).toBe(first);
    });
});
