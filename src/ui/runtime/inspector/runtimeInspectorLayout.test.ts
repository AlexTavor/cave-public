import { describe, expect, it } from "vitest";
import {
    INSPECTOR_MIN_HEIGHT,
    INSPECTOR_VIEWPORT_MARGIN,
    clampInspectorMove,
    clampInspectorResize,
    createDefaultInspectorBounds,
} from "./runtimeInspectorLayout";

describe("runtimeInspectorLayout", () => {
    it("keeps default bounds inside the viewport", () => {
        const bounds = createDefaultInspectorBounds(3, 320, 260);
        expect(bounds.x).toBeGreaterThanOrEqual(INSPECTOR_VIEWPORT_MARGIN);
        expect(bounds.y).toBeGreaterThanOrEqual(INSPECTOR_VIEWPORT_MARGIN);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(304);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(244);
    });

    it("clamps drag movement to the viewport margin", () => {
        const bounds = clampInspectorMove(
            { x: -50, y: -20, width: 300, height: 200 },
            900,
            700,
        );
        expect(bounds.x).toBe(INSPECTOR_VIEWPORT_MARGIN);
        expect(bounds.y).toBe(INSPECTOR_VIEWPORT_MARGIN);
    });

    it("clamps resize to min size and viewport bounds", () => {
        const bounds = clampInspectorResize(
            { x: 700, y: 500, width: 100, height: 100 },
            900,
            700,
        );
        expect(bounds.width).toBe(184);
        expect(bounds.height).toBe(180);
        expect(bounds.width).toBeLessThanOrEqual(
            900 - INSPECTOR_VIEWPORT_MARGIN - 700,
        );
        expect(bounds.height).toBe(INSPECTOR_MIN_HEIGHT);
    });
});
