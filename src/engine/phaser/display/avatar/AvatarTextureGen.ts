import Phaser from "phaser";
import {
    AVATAR_GLOW_CORE_ALPHA,
    AVATAR_GLOW_STAMP_ALPHA,
    AVATAR_GLOW_STAMPS,
} from "./AvatarDisplayConstants";
import {
    AVATAR_EYE_SHAPES,
    AVATAR_FACE_SHAPES,
    AVATAR_HAIR_SHAPES,
} from "./AvatarPartCatalog";
import type { AvatarAppearance } from "./AvatarDisplayTypes";
import {
    assertAvatarAppearance,
    buildAvatarTextureKey,
    drawAvatarPath,
    generateAvatarTexture,
    getAvatarPart,
} from "./AvatarTextureSupport";

export const generateAvatarSilhouetteTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    appearance: AvatarAppearance,
): string => {
    assertAvatarAppearance(appearance);
    const key = buildAvatarTextureKey("silhouette", appearance.appearanceKey);
    if (scene.textures.exists(key)) return key;
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    drawAvatarPath(
        graphics,
        getAvatarPart(AVATAR_FACE_SHAPES, appearance.faceShapeIndex, "face")
            .path,
    );
    drawAvatarPath(
        graphics,
        getAvatarPart(AVATAR_HAIR_SHAPES, appearance.hairShapeIndex, "hair")
            .path,
    );
    return generateAvatarTexture(scene, graphics, key);
};

export const generateAvatarGlowTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    appearance: AvatarAppearance,
): string => {
    assertAvatarAppearance(appearance);
    const key = buildAvatarTextureKey("glow", appearance.appearanceKey);
    if (scene.textures.exists(key)) return key;
    const face = getAvatarPart(
        AVATAR_FACE_SHAPES,
        appearance.faceShapeIndex,
        "face",
    ).path;
    const hair = getAvatarPart(
        AVATAR_HAIR_SHAPES,
        appearance.hairShapeIndex,
        "hair",
    ).path;
    graphics.clear();
    for (const [x, y] of AVATAR_GLOW_STAMPS) {
        graphics.fillStyle(0xffffff, AVATAR_GLOW_STAMP_ALPHA);
        drawAvatarPath(graphics, face, x, y);
        drawAvatarPath(graphics, hair, x, y);
    }
    graphics.fillStyle(0xffffff, AVATAR_GLOW_CORE_ALPHA);
    drawAvatarPath(graphics, face);
    drawAvatarPath(graphics, hair);
    return generateAvatarTexture(scene, graphics, key);
};

export const generateAvatarEyesTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    appearance: AvatarAppearance,
): string => {
    assertAvatarAppearance(appearance);
    const key = buildAvatarTextureKey("eyes", appearance.appearanceKey);
    if (scene.textures.exists(key)) return key;
    const eye = getAvatarPart(
        AVATAR_EYE_SHAPES,
        appearance.eyeShapeIndex,
        "eye",
    ).path;
    graphics.clear();
    graphics.fillStyle(0xffffff, 1);
    drawAvatarPath(
        graphics,
        eye,
        -appearance.eyeSpacing,
        appearance.eyeOffsetY,
        appearance.eyeScaleX,
        appearance.eyeScaleY,
    );
    drawAvatarPath(
        graphics,
        eye,
        appearance.eyeSpacing,
        appearance.eyeOffsetY,
        -appearance.eyeScaleX,
        appearance.eyeScaleY,
    );
    return generateAvatarTexture(scene, graphics, key);
};
