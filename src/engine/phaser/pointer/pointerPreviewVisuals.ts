import type Phaser from "phaser";
import type { TextureManager } from "../utils/TextureManager";
import { hideCycleProgressRope } from "../display/modules/cycle-progress/cycleProgressRopeRenderer";
import { RUNTIME_RING_TEXTURE_OPTIONS } from "../utils/runtimeRingTexture";
import { hidePointerPreviewImage } from "./pointerPreviewImage";

export type PointerPreviewVisuals = {
    carryGlow: Phaser.GameObjects.Image;
    connectionRing: Phaser.GameObjects.Image;
    pickupRing: Phaser.GameObjects.Image;
    previewLine: Phaser.GameObjects.Rope;
    lineTextureKey: string;
};

export const createPointerPreviewVisuals = (
    scene: Phaser.Scene,
    textureManager: TextureManager,
): PointerPreviewVisuals => ({
    lineTextureKey: textureManager.getSolidStripTexture(),
    carryGlow: scene.add.image(
        0,
        0,
        textureManager.getShapeTexture({ shape: "circle", color: "#ffffff" }),
    ),
    connectionRing: scene.add.image(
        0,
        0,
        textureManager.getGlyphTexture(RUNTIME_RING_TEXTURE_OPTIONS),
    ),
    pickupRing: scene.add.image(
        0,
        0,
        textureManager.getGlyphTexture(RUNTIME_RING_TEXTURE_OPTIONS),
    ),
    previewLine: scene.add.rope(0, 0, textureManager.getSolidStripTexture()),
});

export const hidePointerPreviewVisuals = (visuals: PointerPreviewVisuals) => {
    hidePointerPreviewImage(visuals.carryGlow);
    hidePointerPreviewImage(visuals.connectionRing);
    hidePointerPreviewImage(visuals.pickupRing);
    hideCycleProgressRope(visuals.previewLine);
};

export const destroyPointerPreviewVisuals = (
    visuals: PointerPreviewVisuals,
) => {
    visuals.carryGlow.destroy();
    visuals.connectionRing.destroy();
    visuals.pickupRing.destroy();
    visuals.previewLine.destroy();
};
