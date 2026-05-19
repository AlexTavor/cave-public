import type Phaser from "phaser";
import { VEIN_STRIP_BASE_HEIGHT_PX } from "../../../utils/VeinTextureConstants";
import type { VeinPoint } from "./veinsModuleTypes";

type VeinRopeStyle = {
    textureKey: string;
    points: VeinPoint[];
    tint: number;
    alpha: number;
    displayWidthPx: number;
};

const buildScaledPoints = (points: VeinPoint[], scale: number) =>
    points.map(({ x, y }) => ({ x: x / scale, y: y / scale }));

export const hideVeinRope = (rope: Phaser.GameObjects.Rope): void => {
    rope.setVisible(false);
    rope.setScale(1);
    rope.setPosition(0, 0);
    rope.setAlpha(1);
    rope.setDirty();
};

export const syncVeinRope = (
    rope: Phaser.GameObjects.Rope,
    style: VeinRopeStyle,
): void => {
    if (style.points.length < 2) {
        hideVeinRope(rope);
        return;
    }
    const scale = Math.max(style.displayWidthPx, 1) / VEIN_STRIP_BASE_HEIGHT_PX;
    rope.setTexture(style.textureKey);
    rope.setTintFill(false);
    rope.setPosition(0, 0);
    rope.setScale(scale);
    rope.setPoints(buildScaledPoints(style.points, scale));
    rope.setColors(style.tint);
    rope.setAlpha(style.alpha);
    rope.setVisible(true);
    rope.updateVertices();
};
