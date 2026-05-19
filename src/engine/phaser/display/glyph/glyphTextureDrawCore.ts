import Phaser from "phaser";

const C = 64;
const R = 54;
const HOLE_OUTER_RADIUS = R * 0.7;
const HOLE_RING_WIDTH = HOLE_OUTER_RADIUS * 2 * 0.1;
const HOLE_INNER_RADIUS = HOLE_OUTER_RADIUS - HOLE_RING_WIDTH;

const starPoints = (points: number, innerRadius: number) =>
    Array.from({ length: points * 2 }, (_, index) => {
        const angle = (Math.PI / points) * index - Math.PI / 2;
        const radius = index % 2 === 0 ? R : innerRadius;
        return new Phaser.Geom.Point(
            C + Math.cos(angle) * radius,
            C + Math.sin(angle) * radius,
        );
    });

export const drawCoreGlyphShape = (
    g: Phaser.GameObjects.Graphics,
    shape: string,
    thickness: number,
    color: number,
    outsetPx: number,
    alpha = 1,
) => {
    const radius = Math.max(2, thickness / 2) + outsetPx;
    const outer = R + outsetPx;
    g.fillStyle(color, alpha);
    switch (shape) {
        case "crescent":
            g.fillCircle(C, C, R * 0.7 + outsetPx);
            g.fillStyle(0x000000, 1).fillCircle(C + R * 0.3, C, R * 0.55);
            g.fillStyle(color, alpha);
            return true;
        case "hole":
            g.fillCircle(C, C, HOLE_OUTER_RADIUS + outsetPx);
            g.fillStyle(0x000000, 1).fillCircle(C, C, HOLE_INNER_RADIUS);
            g.fillStyle(color, alpha);
            return true;
        case "triangle":
            g.fillTriangle(
                C,
                C - outer,
                C + outer * 0.9,
                C + outer * 0.7,
                C - outer * 0.9,
                C + outer * 0.7,
            );
            return true;
        case "star5":
            g.fillPoints(starPoints(5, R * 0.4 + outsetPx), true);
            return true;
        case "star6":
            g.fillPoints(starPoints(3, outer), true);
            g.fillPoints(
                starPoints(3, outer).map(
                    (point) =>
                        new Phaser.Geom.Point(point.x, 128 - point.y + 10),
                ),
                true,
            );
            return true;
        case "circle":
            g.fillCircle(C, C, outer);
            return true;
        case "pixel":
            g.fillRect(
                C - 8 - outsetPx,
                C - 8 - outsetPx,
                16 + outsetPx * 2,
                16 + outsetPx * 2,
            );
            return true;
        case "plus_rounded":
            g.fillRect(
                C - radius,
                18 - outsetPx,
                radius * 2,
                92 + outsetPx * 2,
            );
            g.fillRect(
                18 - outsetPx,
                C - radius,
                92 + outsetPx * 2,
                radius * 2,
            );
            [
                [C, 18],
                [18, C],
                [110, C],
                [C, 110],
            ].forEach(([x, y]) => g.fillCircle(x, y, radius));
            return true;
        case "triple_circle":
            [
                [64, 42],
                [42, 82],
                [86, 82],
            ].forEach(([x, y]) => g.fillCircle(x, y, 24 + outsetPx));
            return true;
        default:
            return false;
    }
};
