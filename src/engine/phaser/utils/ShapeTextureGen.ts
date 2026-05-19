import Phaser from "phaser";
import { drawComplexShape, isComplexShape } from "./ShapeTextureRecipeRenderer";

export type ShapeKind =
    | "circle"
    | "rect"
    | "hex"
    | "plus_rounded"
    | "triple_circle"
    | "chevron_up_rounded";

export interface ShapeTextureOptions {
    shape: ShapeKind;
    color: string;
    borderColor?: string;
}

export const STANDARD_TEXTURE_RADIUS = 64;

const normalizeColor = (color: string): number =>
    Phaser.Display.Color.HexStringToColor(color).color;

const buildTextureKey = (options: ShapeTextureOptions): string => {
    const color = String(options.color).toLowerCase();
    const border = options.borderColor
        ? String(options.borderColor).toLowerCase()
        : "none";
    return `shape:${options.shape}:${color}:${border}`;
};

const LW = 4;
const drawHexPoints = (radius: number): Phaser.Geom.Point[] =>
    Array.from({ length: 6 }, (_, index) => {
        const angle = (Math.PI / 3) * index - Math.PI / 6;
        return new Phaser.Geom.Point(
            radius + Math.cos(angle) * radius,
            radius + Math.sin(angle) * radius,
        );
    });

const drawShape = (
    g: Phaser.GameObjects.Graphics,
    options: ShapeTextureOptions,
    size: number,
    radius: number,
): void => {
    g.fillStyle(normalizeColor(options.color), 1);
    if (options.borderColor)
        g.lineStyle(LW, normalizeColor(options.borderColor), 1);
    if (isComplexShape(options.shape)) {
        drawComplexShape(g, options.shape, Boolean(options.borderColor));
        return;
    }

    switch (options.shape) {
        case "rect": {
            const off = options.borderColor ? LW / 2 : 0;
            g.fillRect(0, 0, size, size);
            if (options.borderColor)
                g.strokeRect(off, off, size - off * 2, size - off * 2);
            break;
        }
        case "hex": {
            const pts = drawHexPoints(radius - (options.borderColor ? LW : 0));
            g.fillPoints(pts, true);
            if (options.borderColor) g.strokePoints(pts, true);
            break;
        }
        case "circle":
        default: {
            const r = radius - (options.borderColor ? LW / 2 : 0);
            g.fillCircle(radius, radius, r);
            if (options.borderColor) g.strokeCircle(radius, radius, r);
            break;
        }
    }
};

export const generateShapeTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    options: ShapeTextureOptions,
): string => {
    const key = buildTextureKey(options);
    if (scene.textures.exists(key)) return key;
    const size = STANDARD_TEXTURE_RADIUS * 2;
    graphics.clear();
    drawShape(graphics, options, size, STANDARD_TEXTURE_RADIUS);
    graphics.generateTexture(key, size, size);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
};

