// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { useScopedNodeOverlayDisplayBounds } from "./useScopedNodeOverlayDisplayBounds";

describe("useScopedNodeOverlayDisplayBounds", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("keeps references stable for unrelated updates and equal republishes", () => {
        const { result } = renderHook(() =>
            useScopedNodeOverlayDisplayBounds(["b", "a"]),
        );
        const first = result.current;
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "c",
                centerX: 1,
                topY: 2,
                bottomY: 3,
            }),
        );
        expect(result.current).toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 10,
                topY: 20,
                bottomY: 30,
            }),
        );
        const tracked = result.current;
        expect(tracked).not.toBe(first);
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 10,
                topY: 20,
                bottomY: 30,
            }),
        );
        expect(result.current).toBe(tracked);
    });

    it("returns a stable empty reference for empty tracked ids", () => {
        const { result } = renderHook(() =>
            useScopedNodeOverlayDisplayBounds([]),
        );
        const first = result.current;
        act(() =>
            publishNodeOverlayDisplayBounds({
                entityId: "a",
                centerX: 0,
                topY: -1,
                bottomY: 1,
            }),
        );
        expect(result.current).toBe(first);
        expect(result.current).toEqual([]);
    });
});
