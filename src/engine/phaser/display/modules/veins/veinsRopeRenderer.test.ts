import { describe, expect, it } from "vitest";
import { makeRope } from "./veinsDisplayTestUtils";
import { syncVeinRope } from "./veinsRopeRenderer";

describe("syncVeinRope", () => {
    it("hides ropes with fewer than two points", () => {
        const rope = makeRope();
        syncVeinRope(rope as never, {
            textureKey: "vein",
            points: [{ x: 1, y: 2 }],
            tint: 3,
            alpha: 0.4,
            displayWidthPx: 8,
        });
        expect(rope.setVisible).toHaveBeenCalledWith(false);
        expect(rope.setPoints).not.toHaveBeenCalled();
    });

    it("configures texture, tint, alpha, width scaling, and visibility", () => {
        const rope = makeRope();
        syncVeinRope(rope as never, {
            textureKey: "vein",
            points: [
                { x: 0, y: 0 },
                { x: 32, y: 16 },
            ],
            tint: 7,
            alpha: 0.25,
            displayWidthPx: 32,
        });
        expect(rope.setTexture).toHaveBeenCalledWith("vein");
        expect(rope.setTintFill).toHaveBeenCalledWith(false);
        expect(rope.setColors).toHaveBeenCalledWith(7);
        expect(rope.setAlpha).toHaveBeenCalledWith(0.25);
        expect(rope.setScale).toHaveBeenCalledWith(2);
        expect(rope.setPoints).toHaveBeenCalledWith([
            { x: 0, y: 0 },
            { x: 16, y: 8 },
        ]);
        expect(
            (rope.setPoints as any).mock.invocationCallOrder[0],
        ).toBeLessThan((rope.setColors as any).mock.invocationCallOrder[0]);
        expect(rope.setVisible).toHaveBeenCalledWith(true);
        expect(rope.updateVertices).toHaveBeenCalled();
    });

    it("fully overwrites prior rope state on repeated sync", () => {
        const rope = makeRope();
        syncVeinRope(rope as never, {
            textureKey: "old",
            points: [
                { x: 0, y: 0 },
                { x: 16, y: 0 },
            ],
            tint: 1,
            alpha: 1,
            displayWidthPx: 16,
        });
        syncVeinRope(rope as never, {
            textureKey: "new",
            points: [
                { x: 4, y: 8 },
                { x: 20, y: 12 },
            ],
            tint: 9,
            alpha: 0.5,
            displayWidthPx: 8,
        });
        expect(rope.setTexture).toHaveBeenLastCalledWith("new");
        expect(rope.setColors).toHaveBeenLastCalledWith(9);
        expect(rope.setAlpha).toHaveBeenLastCalledWith(0.5);
        expect(rope.setScale).toHaveBeenLastCalledWith(0.5);
        expect(rope.setPoints).toHaveBeenLastCalledWith([
            { x: 8, y: 16 },
            { x: 40, y: 24 },
        ]);
    });
});
