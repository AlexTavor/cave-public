import type Phaser from "phaser";
import { SOLID_STRIP_BASE_HEIGHT_PX } from "../../../utils/SolidStripTextureGen";
import type { CycleProgressRopeRequest } from "./cycleProgressRenderModel";

const scalePoints = (
    points: CycleProgressRopeRequest["points"],
    scale: number,
) => points.map(({ x, y }) => ({ x: x / scale, y: y / scale }));

export const hideCycleProgressRope = (rope: Phaser.GameObjects.Rope): void => {
    rope.setVisible(false);
    rope.setScale(1);
    rope.setPosition(0, 0);
    rope.setAlpha(1);
    rope.setDirty();
};

export const syncCycleProgressRope = (
    rope: Phaser.GameObjects.Rope,
    request: CycleProgressRopeRequest,
): void => {
    if (request.points.length < 2) return hideCycleProgressRope(rope);
    const scale =
        Math.max(request.displayWidthPx, 1) / SOLID_STRIP_BASE_HEIGHT_PX;
    rope.setTexture(request.textureKey);
    rope.setTintFill(false);
    rope.setPosition(0, 0);
    rope.setScale(scale);
    rope.setPoints(scalePoints(request.points, scale));
    rope.setColors(request.tint);
    rope.setAlpha(request.alpha);
    rope.setVisible(true);
    rope.updateVertices();
};
