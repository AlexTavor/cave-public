import Phaser from "phaser";
import type { TextureManager } from "../../../utils/TextureManager";
import type { AvatarAppearance } from "../../avatar/AvatarDisplayTypes";
type Img = Phaser.GameObjects.Image;

export type AvatarStackImages = {
    glowImage: Img;
    silhouetteImage: Img;
    eyesImage: Img;
};

type AvatarStackStyle = {
    x: number;
    y: number;
    scale: number;
    blinkScale: number;
    outlineScale: number;
    silhouetteTint: number;
    outlineTint: number;
    eyeTint: number;
};

type AvatarImageStyle = {
    texture: string;
    tint: number;
    blend: number;
    x: number;
    y: number;
    scaleX: number;
    scaleY?: number;
    alpha?: number;
};

const styleImage = (image: Img, style: AvatarImageStyle): void => {
    image.setTexture(style.texture);
    image.setTint(style.tint);
    image.setBlendMode(style.blend as Phaser.BlendModes);
    image.setAlpha(style.alpha ?? 1);
    image.setPosition(style.x, style.y);
    image.setScale(style.scaleX, style.scaleY ?? style.scaleX);
    image.setVisible(true);
};

export const hideAvatarImages = (images: Array<Img | null>): void => {
    images.forEach((image) => image?.setVisible(false));
};

export const renderAvatarStack = (
    textureManager: TextureManager,
    images: AvatarStackImages,
    appearance: AvatarAppearance,
    style: AvatarStackStyle,
): void => {
    styleImage(images.glowImage, {
        texture: textureManager.getAvatarGlowTexture(appearance),
        tint: style.outlineTint,
        blend: 1,
        x: style.x,
        y: style.y,
        scaleX: style.scale * style.outlineScale,
    });
    styleImage(images.silhouetteImage, {
        texture: textureManager.getAvatarSilhouetteTexture(appearance),
        tint: style.silhouetteTint,
        blend: 0,
        x: style.x,
        y: style.y,
        scaleX: style.scale,
    });
    styleImage(images.eyesImage, {
        texture: textureManager.getAvatarEyesTexture(appearance),
        tint: style.eyeTint,
        blend: 1,
        x: style.x,
        y: style.y,
        scaleX: style.scale,
        scaleY: style.scale * style.blinkScale,
    });
};
