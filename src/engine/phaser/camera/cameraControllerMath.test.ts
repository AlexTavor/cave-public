import { describe, it, expect } from "vitest";
import {
    viewSize,
    isZoomValid,
    evaluateZoom,
    minCompatibleZoom,
    clampCenter,
    isClick,
} from "./cameraControllerMath";
import type {
    CameraConfig,
    WorldConfig,
} from "../../../data/schemas/game/cameraWorldConfig";
import { CameraConfigSchema } from "../../../data/schemas/game/cameraWorldConfig";

const world: WorldConfig = { width: 1000, height: 800 };
const vp = { width: 800, height: 600 };
const cam: CameraConfig = CameraConfigSchema.parse({
    zoom: { min: 0.5, max: 3, start: 1, scrollFactor: 0.1 },
    pan: { damping: 0.1, focusLerpMs: 500, boundsPadding: 0, dragThreshold: 5 },
});

describe("viewSize", () => {
    it("returns viewport divided by zoom", () => {
        const s = viewSize(vp, 2);
        expect(s).toEqual({ w: 400, h: 300 });
    });
});

describe("isZoomValid", () => {
    it("returns true when view fits world", () => {
        expect(isZoomValid(vp, 1, world)).toBe(true);
    });
    it("rejects zoom where view exceeds world width", () => {
        expect(isZoomValid(vp, 0.1, world)).toBe(false);
    });
});

describe("evaluateZoom", () => {
    it("clamps to [min, max] and returns valid zoom", () => {
        expect(evaluateZoom(5, cam, vp, world)).toBe(3);
    });
    it("promotes zoom to the minimum compatible value for the viewport", () => {
        expect(
            evaluateZoom(0.5, cam, { width: 1200, height: 600 }, world),
        ).toBe(1.2);
    });
    it("returns null when clamped zoom is still invalid", () => {
        const tiny: WorldConfig = { width: 100, height: 100 };
        expect(evaluateZoom(0.5, cam, vp, tiny)).toBeNull();
    });
});

describe("minCompatibleZoom", () => {
    it("returns the larger world-fit ratio", () => {
        expect(minCompatibleZoom({ width: 1200, height: 600 }, world)).toBe(
            1.2,
        );
    });
});

describe("clampCenter", () => {
    it("returns center unchanged when inside bounds", () => {
        const c = clampCenter(500, 400, vp, 1, world);
        expect(c.x).toBe(500);
        expect(c.y).toBe(400);
    });
    it("clamps center so view stays inside world", () => {
        const c = clampCenter(0, 0, vp, 1, world);
        expect(c.x).toBeGreaterThanOrEqual(400);
        expect(c.y).toBeGreaterThanOrEqual(300);
    });
});

describe("isClick", () => {
    it("classifies small travel as click", () => {
        expect(isClick(2, 5)).toBe(true);
    });
    it("classifies large travel as drag", () => {
        expect(isClick(10, 5)).toBe(false);
    });
});

