import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { applyRequestedCamera } from "./cameraRestore";

const LEGACY_WORLD = {
    ...DEFAULT_GAME_CONFIG.world,
    width: 5000,
    height: 5000,
};

const makeCamera = () => ({
    width: 200,
    height: 100,
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
    setZoom(next: number) {
        this.zoom = next;
    },
});

describe("applyRequestedCamera", () => {
    it("applies an external camera request when it differs from the live camera", () => {
        const camera = makeCamera();

        const applied = applyRequestedCamera(
            camera as any,
            { centerX: 250, centerY: 175, zoom: 1.5 },
            DEFAULT_GAME_CONFIG.camera,
            DEFAULT_GAME_CONFIG.world,
        );

        expect(applied).toBe(true);
        expect(camera.zoom).toBe(1.5);
        expect(camera.scrollX).toBeCloseTo(250 - 200 / 3, 5);
        expect(camera.scrollY).toBeCloseTo(175 - 100 / 3, 5);
    });

    it("does nothing when the requested state already matches the camera", () => {
        const camera = makeCamera();

        const applied = applyRequestedCamera(
            camera as any,
            { centerX: 100, centerY: 50, zoom: 1 },
            DEFAULT_GAME_CONFIG.camera,
            DEFAULT_GAME_CONFIG.world,
        );

        expect(applied).toBe(false);
        expect(camera.scrollX).toBe(0);
        expect(camera.scrollY).toBe(0);
    });

    it("promotes an incompatible saved zoom to a compatible widescreen zoom", () => {
        const camera = { ...makeCamera(), width: 3000, height: 600 };

        const applied = applyRequestedCamera(
            camera as any,
            { centerX: 250, centerY: 175, zoom: 0.5 },
            DEFAULT_GAME_CONFIG.camera,
            LEGACY_WORLD,
        );

        expect(applied).toBe(true);
        expect(camera.zoom).toBe(0.6);
    });
});
