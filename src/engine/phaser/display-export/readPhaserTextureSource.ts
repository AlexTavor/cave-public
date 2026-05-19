import type Phaser from "phaser";

export const readPhaserTextureSource = (
    scene: Phaser.Scene,
    key: string,
): CanvasImageSource => {
    const texture = scene.textures.get(key);
    const source = texture?.getSourceImage();
    const image = Array.isArray(source) ? source[0] : source;
    if (!image) {
        throw new Error(
            `[DisplayImageExport] Missing readable Phaser texture: ${key}`,
        );
    }
    return image as CanvasImageSource;
};
