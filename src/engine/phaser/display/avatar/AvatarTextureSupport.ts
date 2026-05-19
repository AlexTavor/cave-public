import Phaser from "phaser";
import {
    AVATAR_CANVAS_CENTER,
    AVATAR_CANVAS_SIZE,
} from "./AvatarDisplayConstants";
import type {
    AvatarAppearance,
    AvatarCatalogRecord,
    NormalizedShapePath,
} from "./AvatarDisplayTypes";

export const buildAvatarTextureKey = (
    family: string,
    appearanceKey: string,
): string => `avatar:${family}:${appearanceKey}`;

export const getAvatarPart = (
    parts: readonly AvatarCatalogRecord[],
    index: number,
    label: string,
): AvatarCatalogRecord => {
    const part = parts[index];
    if (part) return part;
    throw new Error(`[AvatarTextureGen] Invalid ${label} index: ${index}`);
};

export const drawAvatarPath = (
    graphics: Phaser.GameObjects.Graphics,
    path: NormalizedShapePath,
    offsetX = 0,
    offsetY = 0,
    scaleX = 1,
    scaleY = 1,
): void => {
    graphics.beginPath();
    graphics.moveTo(
        AVATAR_CANVAS_CENTER + offsetX + path[0].x * scaleX,
        AVATAR_CANVAS_CENTER + offsetY + path[0].y * scaleY,
    );
    for (const point of path.slice(1)) {
        graphics.lineTo(
            AVATAR_CANVAS_CENTER + offsetX + point.x * scaleX,
            AVATAR_CANVAS_CENTER + offsetY + point.y * scaleY,
        );
    }
    graphics.closePath();
    graphics.fillPath();
};

export const generateAvatarTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    key: string,
): string => {
    graphics.generateTexture(key, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
};

export const assertAvatarAppearance = (appearance: AvatarAppearance): void => {
    if (appearance.appearanceKey) return;
    throw new Error("[AvatarTextureGen] appearanceKey is required");
};
