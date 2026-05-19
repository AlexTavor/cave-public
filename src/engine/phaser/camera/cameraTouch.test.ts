import { describe, expect, it } from "vitest";
import { beginPinch, isPrimaryCameraPointer, updatePinch } from "./cameraTouch";

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

describe("cameraTouch", () => {
    it("accepts touch pointers as primary camera input", () => {
        expect(
            isPrimaryCameraPointer({ pointerType: "touch", button: -1 } as any),
        ).toBe(true);
        expect(
            isPrimaryCameraPointer({ pointerType: "mouse", button: 2 } as any),
        ).toBe(false);
    });

    it("updates zoom around the pinch midpoint", () => {
        const camera = baseCamera();
        const first = { x: 60, y: 40 } as any;
        const second = { x: 80, y: 40 } as any;
        const pinch = beginPinch(camera, first, second);

        const changed = updatePinch(
            pinch,
            camera,
            first,
            { x: 100, y: 40 } as any,
            { zoom: { min: 0.5, max: 3, start: 1, scrollFactor: 0.1 } } as any,
            { width: 500, height: 500 } as any,
        );

        expect(changed).toBe(true);
        expect(camera.zoom).toBe(2);
        expect(camera.scrollX).toBe(20);
        expect(camera.scrollY).toBe(7.5);
    });
});
