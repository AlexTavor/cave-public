import Phaser from "phaser";
import { VEIN_STRIP_BASE_HEIGHT_PX } from "./VeinTextureConstants";

const VEIN_STRIP_TEXTURE_KEY = "vein-strip:white:default";
const VEIN_STRIP_LENGTH_PX = 128;

const drawStrip = (
    graphics: Phaser.GameObjects.Graphics,
    y: number,
    height: number,
    alpha: number,
) => {
    graphics.fillStyle(0xffffff, alpha);
    graphics.fillRect(0, y, VEIN_STRIP_LENGTH_PX, height);
};

export const ensureVeinStripTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
): string => {
    if (scene.textures.exists(VEIN_STRIP_TEXTURE_KEY)) {
        return VEIN_STRIP_TEXTURE_KEY;
    }
    graphics.clear();
    drawStrip(graphics, 0, VEIN_STRIP_BASE_HEIGHT_PX, 0.42);
    drawStrip(graphics, 2, 12, 0.78);
    drawStrip(graphics, 4, 8, 1);
    graphics.generateTexture(
        VEIN_STRIP_TEXTURE_KEY,
        VEIN_STRIP_LENGTH_PX,
        VEIN_STRIP_BASE_HEIGHT_PX,
    );
    scene.textures
        .get(VEIN_STRIP_TEXTURE_KEY)
        .setFilter(Phaser.Textures.FilterMode.LINEAR);
    return VEIN_STRIP_TEXTURE_KEY;
};
