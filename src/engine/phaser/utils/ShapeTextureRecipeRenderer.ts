import Phaser from "phaser";

export type ComplexShapeKind =
    | "plus_rounded"
    | "triple_circle"
    | "chevron_up_rounded";

type Recipe = {
    circles?: ReadonlyArray<readonly [number, number, number]>;
    rects?: ReadonlyArray<readonly [number, number, number, number]>;
    segments?: ReadonlyArray<readonly [number, number, number, number, number]>;
};

const LW = 4;
const RECIPES: Record<ComplexShapeKind, Recipe> = {
    plus_rounded: {
        rects: [
            [48, 30, 32, 68],
            [30, 48, 68, 32],
        ],
        circles: [
            [64, 30, 16],
            [30, 64, 16],
            [98, 64, 16],
            [64, 98, 16],
        ],
    },
    triple_circle: {
        circles: [
            [64, 42, 24],
            [42, 82, 24],
            [86, 82, 24],
        ],
    },
    chevron_up_rounded: {
        segments: [
            [36, 82, 64, 40, 12],
            [64, 40, 92, 82, 12],
        ],
        circles: [
            [36, 82, 12],
            [64, 40, 12],
            [92, 82, 12],
        ],
    },
};

const buildSegment = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    radius: number,
): Phaser.Geom.Point[] => {
    const angle = Math.atan2(by - ay, bx - ax);
    const leftX = Math.cos(angle + Math.PI / 2) * radius;
    const leftY = Math.sin(angle + Math.PI / 2) * radius;
    return [
        new Phaser.Geom.Point(ax + leftX, ay + leftY),
        new Phaser.Geom.Point(bx + leftX, by + leftY),
        new Phaser.Geom.Point(bx - leftX, by - leftY),
        new Phaser.Geom.Point(ax - leftX, ay - leftY),
    ];
};

export const drawComplexShape = (
    g: Phaser.GameObjects.Graphics,
    shape: ComplexShapeKind,
    hasBorder: boolean,
): void => {
    const recipe = RECIPES[shape];
    for (const [x, y, width, height] of recipe.rects ?? []) {
        g.fillRect(x, y, width, height);
        if (hasBorder)
            g.strokeRect(x + LW / 2, y + LW / 2, width - LW, height - LW);
    }
    for (const [ax, ay, bx, by, radius] of recipe.segments ?? []) {
        const points = buildSegment(ax, ay, bx, by, radius);
        g.fillPoints(points, true);
        if (hasBorder) g.strokePoints(points, true);
    }
    for (const [x, y, radius] of recipe.circles ?? []) {
        g.fillCircle(x, y, radius);
        if (hasBorder) g.strokeCircle(x, y, radius - LW / 2);
    }
};

export const isComplexShape = (shape: string): shape is ComplexShapeKind =>
    shape in RECIPES;
