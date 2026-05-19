// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type { ReactNode, RefObject } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { TestWorldInteractionProvider } from "../testUtils";
import {
    createMutableNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import { useCaveStatusOverlayPosition } from "./useCaveStatusOverlayPosition";

const makeRootRef = (width = 240, height = 180) => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", { value: width });
    Object.defineProperty(element, "clientHeight", { value: height });
    Object.defineProperty(element, "getBoundingClientRect", {
        value: () => ({ width, height }),
    });
    return { current: element } as RefObject<HTMLElement | null>;
};

const makeWrapper =
    (runtime: ReturnType<typeof createMutableNodeOverlayRuntime>) =>
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

describe("useCaveStatusOverlayPosition", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("changes only for sys_world bounds updates and reuses equal positions", () => {
        const runtime = createMutableNodeOverlayRuntime([], {
            sys_world: makePhysicsBody("sys_world", 10, 10),
            a: makePhysicsBody("a", 0, 0),
        });
        const { result } = renderHook(
            () => useCaveStatusOverlayPosition(makeRootRef(), true),
            { wrapper: makeWrapper(runtime) },
        );
        const first = result.current;
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 0,
                topY: -10,
                bottomY: 10,
            }),
        );
        expect(result.current).toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "sys_world",
                centerX: 10,
                topY: 0,
                bottomY: 20,
            }),
        );
        expect(result.current).toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "sys_world",
                centerX: 20,
                topY: 0,
                bottomY: 20,
            }),
        );
        expect(result.current).toEqual({ x: 140, y: 90 });
        expect(result.current).not.toBe(first);
    });

    it("returns null when disabled or the viewport is zero-sized", () => {
        const runtime = createMutableNodeOverlayRuntime([], {
            sys_world: makePhysicsBody("sys_world", 10, 10),
        });
        const wrapper = makeWrapper(runtime);
        expect(
            renderHook(
                () => useCaveStatusOverlayPosition(makeRootRef(), false),
                {
                    wrapper,
                },
            ).result.current,
        ).toBeNull();
        expect(
            renderHook(
                () => useCaveStatusOverlayPosition(makeRootRef(0, 0), true),
                {
                    wrapper,
                },
            ).result.current,
        ).toBeNull();
    });
});
