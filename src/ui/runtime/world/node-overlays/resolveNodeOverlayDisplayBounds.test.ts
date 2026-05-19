import { beforeEach, describe, expect, it } from "vitest";
import {
    publishNodeOverlayDisplayBounds,
    resetNodeOverlayDisplayBounds,
} from "../../../../engine/phaser/display/node-overlay/nodeOverlayDisplayBoundsStore";
import { resolveNodeOverlayDisplayBounds } from "./resolveNodeOverlayDisplayBounds";

describe("resolveNodeOverlayDisplayBounds", () => {
    beforeEach(() => resetNodeOverlayDisplayBounds());

    it("returns published renderer bounds when present", () => {
        publishNodeOverlayDisplayBounds({
            entityId: "node",
            centerX: 4,
            topY: 1,
            bottomY: 9,
        });
        expect(
            resolveNodeOverlayDisplayBounds(
                { getPhysicsBody: () => null },
                "node",
            ),
        ).toEqual({ entityId: "node", centerX: 4, topY: 1, bottomY: 9 });
    });

    it("returns the supplied override without consulting the store", () => {
        expect(
            resolveNodeOverlayDisplayBounds(
                { getPhysicsBody: () => null },
                "node",
                { entityId: "node", centerX: 8, topY: 2, bottomY: 12 },
            ),
        ).toEqual({ entityId: "node", centerX: 8, topY: 2, bottomY: 12 });
    });

    it("falls back to physics-circle bounds when no renderer bounds exist", () => {
        expect(
            resolveNodeOverlayDisplayBounds(
                {
                    getPhysicsBody: () => ({
                        position: { x: 8, y: 10 },
                        radius: 3,
                    }),
                },
                "node",
            ),
        ).toEqual({ entityId: "node", centerX: 8, topY: 7, bottomY: 13 });
    });

    it("returns null when neither source exists", () => {
        expect(
            resolveNodeOverlayDisplayBounds(
                { getPhysicsBody: () => null },
                "missing",
            ),
        ).toBeNull();
    });
});
