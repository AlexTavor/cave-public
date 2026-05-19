import type Phaser from "phaser";

type Img = Phaser.GameObjects.Image;
type GlyphImageState = {
    textureKey: string;
    tint: number | null;
    alpha: number;
    blendMode: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    visible: boolean;
};

const states = new WeakMap<Img, GlyphImageState>();

export const hideGlyphImage = (img: Img) => {
    const state = states.get(img);
    if (!state?.visible) return;
    img.setVisible(false);
    states.set(img, { ...state, visible: false });
};

export const syncGlyphImage = (img: Img, next: GlyphImageState) => {
    const prev = states.get(img);
    if (prev?.textureKey !== next.textureKey) img.setTexture(next.textureKey);
    if (next.tint === null) {
        if (prev?.tint !== null) img.clearTint();
    } else if (prev?.tint !== next.tint) img.setTint(next.tint);
    if (prev?.alpha !== next.alpha) img.setAlpha(next.alpha);
    if (prev?.blendMode !== next.blendMode)
        img.setBlendMode(next.blendMode as Phaser.BlendModes);
    if (prev?.x !== next.x || prev?.y !== next.y)
        img.setPosition(next.x, next.y);
    if (prev?.scale !== next.scale) img.setScale(next.scale);
    if (prev?.rotation !== next.rotation) img.setRotation(next.rotation);
    if (prev?.visible !== next.visible) img.setVisible(next.visible);
    states.set(img, next);
};

export const clearGlyphImageState = (img: Img) => states.delete(img);
