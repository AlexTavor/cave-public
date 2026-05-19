import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_WORLD_BOUNDS } from "../../../data/schemas/game/defaultWorldBounds";
import {
    applyBootstrapCamera,
    readCameraBootstrapConfig,
} from "./cameraControllerBootstrap";

const withStartZoom = (start: number) => ({
    ...DEFAULT_GAME_CONFIG,
    camera: {
        ...DEFAULT_GAME_CONFIG.camera,
        zoom: { ...DEFAULT_GAME_CONFIG.camera.zoom, start },
    },
});

const makeRuntime = (configZoom: number | null, assetsZoom: number | null) => ({
    getCartridge: () => ({
        config: configZoom
            ? { settings: { game_config: withStartZoom(configZoom) } }
            : undefined,
        assets: assetsZoom
            ? { settings: { game_config: withStartZoom(assetsZoom) } }
            : undefined,
    }),
    getEntity: () => undefined,
});

const makeCamera = () => ({
    width: 800,
    height: 600,
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
    setOrigin() {},
    setZoom(next: number) {
        this.zoom = next;
    },
});

describe("cameraControllerBootstrap", () => {
    it("uses core cave game_config for the starting zoom", () => {
        const runtime = makeRuntime(1.75, 2.5) as any;
        const bootstrap = readCameraBootstrapConfig(runtime);
        const cam = makeCamera();

        applyBootstrapCamera(
            cam as any,
            runtime,
            null,
            bootstrap.camera,
            bootstrap.world,
        );

        expect(bootstrap.camera.zoom.start).toBe(1.75);
        expect(cam.zoom).toBe(1.75);
    });

    it("falls back to asset settings when config settings are absent", () => {
        const runtime = makeRuntime(null, 2.25) as any;

        expect(readCameraBootstrapConfig(runtime).camera.zoom.start).toBe(2.25);
    });

    it("expands the default world bounds with the moved cave anchor", () => {
        expect(
            readCameraBootstrapConfig(makeRuntime(null, null) as any).world,
        ).toEqual(DEFAULT_WORLD_BOUNDS);
    });

    it("promotes an incompatible start zoom on wide viewports", () => {
        const runtime = makeRuntime(0.1, null) as any;
        const bootstrap = readCameraBootstrapConfig(runtime);
        const cam = { ...makeCamera(), width: 5200, height: 600 };

        applyBootstrapCamera(
            cam as any,
            runtime,
            null,
            bootstrap.camera,
            bootstrap.world,
        );

        expect(cam.zoom).toBeCloseTo(5200 / DEFAULT_WORLD_BOUNDS.width, 5);
    });
});
