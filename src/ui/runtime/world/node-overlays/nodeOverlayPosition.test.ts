import { describe, expect, it } from "vitest";
import {
    projectNodeOverlayWorldPoint,
    resolveBottomNodeOverlayPosition,
    resolveTopNodeOverlayPosition,
} from "./nodeOverlayPosition";

describe("nodeOverlayPosition", () => {
    it("projects arbitrary world points into snapped screen space", () => {
        expect(
            projectNodeOverlayWorldPoint({
                cameraState: { centerX: 50, centerY: 25, zoom: 1 },
                viewportWidth: 200,
                viewportHeight: 100,
                worldX: 50.4,
                worldY: 25.6,
            }),
        ).toEqual({ x: 100, y: 51 });
    });

    it("anchors top edges above the projected display bounds", () => {
        expect(
            resolveTopNodeOverlayPosition({
                cameraState: { centerX: 0, centerY: 0, zoom: 2 },
                viewportWidth: 100,
                viewportHeight: 80,
                bounds: { entityId: "node", centerX: 10, topY: 2, bottomY: 20 },
            }),
        ).toEqual({ x: 70, y: 44 });
    });

    it("anchors bottom edges below the projected display bounds and guards missing prerequisites", () => {
        expect(
            resolveBottomNodeOverlayPosition({
                cameraState: { centerX: 0, centerY: 0, zoom: 2 },
                viewportWidth: 100,
                viewportHeight: 80,
                bounds: { entityId: "node", centerX: 10, topY: 2, bottomY: 20 },
            }),
        ).toEqual({ x: 70, y: 80 });
        expect(
            resolveTopNodeOverlayPosition({
                cameraState: null,
                viewportWidth: 100,
                viewportHeight: 80,
                bounds: { entityId: "node", centerX: 0, topY: 0, bottomY: 4 },
            }),
        ).toBeNull();
    });
});
