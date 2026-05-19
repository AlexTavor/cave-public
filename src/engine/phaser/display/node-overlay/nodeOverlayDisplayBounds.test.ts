import { describe, expect, it } from "vitest";
import {
    createNodeOverlayDisplayBoundsFromImageBounds,
    createNodeOverlayDisplayBoundsFromImageBoundsUnion,
    createNodeOverlayDisplayBoundsFromLocalExtents,
    createNodeOverlayDisplayBoundsFromRadius,
} from "./nodeOverlayDisplayBounds";

describe("nodeOverlayDisplayBounds", () => {
    it("creates centered top and bottom bounds from a radius", () => {
        expect(
            createNodeOverlayDisplayBoundsFromRadius({
                entityId: "node",
                centerX: 8,
                centerY: 5,
                radius: 3,
            }),
        ).toEqual({ entityId: "node", centerX: 8, topY: 2, bottomY: 8 });
    });

    it("derives bounds from a single image rectangle", () => {
        expect(
            createNodeOverlayDisplayBoundsFromImageBounds("node", {
                x: 4,
                y: 10,
                width: 8,
                height: 6,
            }),
        ).toEqual({ entityId: "node", centerX: 8, topY: 10, bottomY: 16 });
    });

    it("builds a union across multiple image rectangles", () => {
        expect(
            createNodeOverlayDisplayBoundsFromImageBoundsUnion("node", [
                { x: 0, y: 8, width: 10, height: 12 },
                { x: 20, y: 2, width: 6, height: 10 },
            ]),
        ).toEqual({ entityId: "node", centerX: 14, topY: 2, bottomY: 20 });
    });

    it("converts local vertical extents into world bounds", () => {
        expect(
            createNodeOverlayDisplayBoundsFromLocalExtents({
                entityId: "node",
                centerX: 12,
                centerY: 50,
                minY: -9,
                maxY: 14,
            }),
        ).toEqual({ entityId: "node", centerX: 12, topY: 41, bottomY: 64 });
    });

    it("returns null for unusable geometry", () => {
        expect(
            createNodeOverlayDisplayBoundsFromRadius({
                entityId: "node",
                centerX: 0,
                centerY: 0,
                radius: 0,
            }),
        ).toBeNull();
        expect(
            createNodeOverlayDisplayBoundsFromImageBounds("node", {
                x: 0,
                y: 0,
                width: 0,
                height: 4,
            }),
        ).toBeNull();
        expect(
            createNodeOverlayDisplayBoundsFromImageBoundsUnion("node", []),
        ).toBeNull();
    });
});
