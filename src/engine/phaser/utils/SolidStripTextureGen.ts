import type Phaser from "phaser";

export const SOLID_STRIP_BASE_HEIGHT_PX = 16;
const LINEAR_FILTER = "LINEAR" as unknown as Phaser.Textures.FilterMode;

const SOLID_STRIP_TEXTURE_KEY = "solid-strip:white:default";
const SOLID_STRIP_LENGTH_PX = 128;

export const ensureSolidStripTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
): string => {
    if (scene.textures.exists(SOLID_STRIP_TEXTURE_KEY)) {
        return SOLID_STRIP_TEXTURE_KEY;
    }
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, SOLID_STRIP_LENGTH_PX, SOLID_STRIP_BASE_HEIGHT_PX);
    graphics.generateTexture(
        SOLID_STRIP_TEXTURE_KEY,
        SOLID_STRIP_LENGTH_PX,
        SOLID_STRIP_BASE_HEIGHT_PX,
    );
    scene.textures.get(SOLID_STRIP_TEXTURE_KEY).setFilter(LINEAR_FILTER);
    return SOLID_STRIP_TEXTURE_KEY;
};
