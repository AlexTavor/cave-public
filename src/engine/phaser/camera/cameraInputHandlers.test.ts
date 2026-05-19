import { describe, expect, it, vi } from "vitest";
import {
    beginDrag,
    clampAndApply,
    handleWheel,
    publishCameraState,
    updateDrag,
} from "./cameraInputHandlers";

const baseCamera = () =>
    ({
        zoom: 1,
        width: 200,
        height: 100,
        x: 40,
        y: 25,
        scrollX: 0,
        scrollY: 0,
        setZoom(next: number) {
            this.zoom = next;
        },
        getWorldPoint(x: number, y: number) {
            return {
                x: this.scrollX + x / this.zoom,
                y: this.scrollY + y / this.zoom,
            };
        },
    }) as any;

describe("cameraInputHandlers", () => {
    it("zooms around the wheel pointer", () => {
        const camera = baseCamera();
        const publish = vi.fn();

        handleWheel(
            camera,
            70,
            45,
            -1,
            { zoom: { min: 0.5, max: 3, start: 1, scrollFactor: 1 } } as any,
            { width: 500, height: 500 } as any,
            publish,
        );

        expect(camera.zoom).toBe(2);
        expect(camera.scrollX).toBe(15);
        expect(camera.scrollY).toBe(10);
        expect(publish).toHaveBeenCalledOnce();
    });

    it("publishes the clamped camera state during edge drag", () => {
        const camera = baseCamera();
        const setCameraState = vi.fn();
        const drag = beginDrag({ x: 0, y: 0 } as any, camera, false);

        updateDrag({ x: -400, y: -200 } as any, drag, camera, { x: 0, y: 0 });
        clampAndApply(camera, { width: 220, height: 120 } as any);
        publishCameraState(camera, setCameraState);

        expect(camera.scrollX).toBe(20);
        expect(camera.scrollY).toBe(20);
        expect(setCameraState).toHaveBeenCalledWith({
            centerX: 120,
            centerY: 70,
            zoom: 1,
        });
    });
});
