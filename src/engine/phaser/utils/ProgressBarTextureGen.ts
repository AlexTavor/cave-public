const PROGRESS_BAR_STRIP_TEXTURE_KEY = "progress-bar:strip";
export const PROGRESS_BAR_STRIP_BASE_HEIGHT_PX = 16;

export const ensureProgressBarStripTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
) => {
    if (scene.textures.exists(PROGRESS_BAR_STRIP_TEXTURE_KEY)) {
        return PROGRESS_BAR_STRIP_TEXTURE_KEY;
    }
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, 96, 16, 8);
    graphics.generateTexture(PROGRESS_BAR_STRIP_TEXTURE_KEY, 96, 16);
    scene.textures
        .get(PROGRESS_BAR_STRIP_TEXTURE_KEY)
        .setFilter(Phaser.Textures.FilterMode.LINEAR);
    return PROGRESS_BAR_STRIP_TEXTURE_KEY;
};
