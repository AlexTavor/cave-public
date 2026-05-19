import type Phaser from "phaser";

const resolveScale = (image: { width?: number }, radius: number): number =>
    (radius * 2) / Math.max(image.width ?? 1, 1);

export const hidePointerPreviewImage = (
    image: Phaser.GameObjects.Image,
): void => {
    image.setVisible(false);
};

export const syncPointerPreviewImage = (
    image: Phaser.GameObjects.Image,
    input: {
        x: number;
        y: number;
        radius: number;
        tint: number;
        alpha: number;
    },
): void => {
    image.setTint(input.tint);
    image.setPosition(input.x, input.y);
    image.setAlpha(input.alpha);
    image.setScale(resolveScale(image, input.radius));
    image.setVisible(true);
};
