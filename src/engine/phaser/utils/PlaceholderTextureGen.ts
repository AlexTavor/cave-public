import Phaser from "phaser";
import { TextureKeys } from "../display/placeholder/TextureKeys";

const R = 64; // Standard radius
const SIZE = R * 2;
const WHITE = 0xffffff;

type DrawFn = (g: Phaser.GameObjects.Graphics) => void;

const drawCircle: DrawFn = (g) => {
    g.fillCircle(R, R, R);
};

const drawTriangle: DrawFn = (g) => {
    g.fillTriangle(R, 4, SIZE - 4, SIZE - 4, 4, SIZE - 4);
};

const drawStar: DrawFn = (g) => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? R - 4 : R * 0.45;
        pts.push(
            new Phaser.Geom.Point(
                R + Math.cos(angle) * r,
                R + Math.sin(angle) * r,
            ),
        );
    }
    g.fillPoints(pts, true);
};

const drawOctagon: DrawFn = (g) => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI / 4) * i - Math.PI / 8;
        pts.push(
            new Phaser.Geom.Point(
                R + Math.cos(angle) * (R - 4),
                R + Math.sin(angle) * (R - 4),
            ),
        );
    }
    g.fillPoints(pts, true);
};

const drawPlus: DrawFn = (g) => {
    const w = R * 0.35;
    g.fillRect(R - w, 4, w * 2, SIZE - 8);
    g.fillRect(4, R - w, SIZE - 8, w * 2);
};

const drawHexagon: DrawFn = (g) => {
    const pts: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(
            new Phaser.Geom.Point(
                R + Math.cos(angle) * (R - 4),
                R + Math.sin(angle) * (R - 4),
            ),
        );
    }
    g.fillPoints(pts, true);
};

const drawDiamond: DrawFn = (g) => {
    g.fillTriangle(R, 4, SIZE - 4, R, R, SIZE - 4);
    g.fillTriangle(R, 4, 4, R, R, SIZE - 4);
};

const drawSquare: DrawFn = (g) => {
    g.fillRect(4, 4, SIZE - 8, SIZE - 8);
};

const SHAPE_DRAW_MAP: Record<TextureKeys, DrawFn> = {
    [TextureKeys.CIRCLE]: drawCircle,
    [TextureKeys.TRIANGLE]: drawTriangle,
    [TextureKeys.STAR]: drawStar,
    [TextureKeys.OCTAGON]: drawOctagon,
    [TextureKeys.PLUS]: drawPlus,
    [TextureKeys.HEXAGON]: drawHexagon,
    [TextureKeys.DIAMOND]: drawDiamond,
    [TextureKeys.SQUARE]: drawSquare,
};

export const generatePlaceholderTextures = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
): void => {
    for (const key of Object.values(TextureKeys)) {
        if (scene.textures.exists(key)) continue;
        graphics.clear();
        graphics.fillStyle(WHITE, 1);
        SHAPE_DRAW_MAP[key](graphics);
        graphics.generateTexture(key, SIZE, SIZE);
        scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
};
