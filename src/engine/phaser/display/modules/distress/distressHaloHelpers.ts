import type Phaser from "phaser";

const HALO_PADDING = 1.15;
const HALO_START_SCALE = 0.7;
const HALO_END_SCALE = 3.4;
const HALO_DURATION_MS = 1200;
const HALO_STAGGER_MS = 170;

const resolveHaloScale = (halo: { width?: number }, radius: number): number =>
    (radius * HALO_PADDING * 2) / Math.max(halo.width ?? 1, 1);

export const hideDistressHalos = (
    tweens: Phaser.Scene["tweens"],
    halos: Phaser.GameObjects.Image[],
) => {
    tweens.killTweensOf(halos);
    halos.forEach((halo) => halo.setVisible(false));
};

export const startDistressBurst = (
    tweens: Phaser.Scene["tweens"],
    halos: Phaser.GameObjects.Image[],
    radius: number,
    repeatDelay: number,
) => {
    const scale = resolveHaloScale(halos[0], radius);
    tweens.killTweensOf(halos);
    halos.forEach((halo, index) => {
        halo.setPosition(0, 0);
        halo.setAlpha(0.75);
        halo.setScale(scale * HALO_START_SCALE);
        halo.setVisible(true);
        tweens.add({
            targets: halo,
            scale: scale * HALO_END_SCALE,
            alpha: 0,
            duration: HALO_DURATION_MS,
            delay: index * HALO_STAGGER_MS,
            repeat: -1,
            repeatDelay,
            ease: "Sine.easeOut",
        });
    });
};
