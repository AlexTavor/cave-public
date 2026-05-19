import Phaser from "phaser";
import { BLEND_MODE_NORMAL } from "../blendModes";

type Poolable = Phaser.GameObjects.GameObject & {
    clear?: () => void;
    clearMask?: (destroyMask?: boolean) => void;
    clearTint?: () => void;
    parentContainer?: { remove: (child: unknown) => void };
    removeAll?: (destroyChild?: boolean) => void;
    scene?: Phaser.Scene;
    setAlpha?: (value: number) => void;
    setBlendMode?: (mode: Phaser.BlendModes) => void;
    setFlip?: (flipX: boolean, flipY: boolean) => void;
    setFlipX?: (value: boolean) => void;
    setFlipY?: (value: boolean) => void;
    setPosition?: (x: number, y: number) => void;
    setRotation?: (value: number) => void;
    setScale?: (x: number, y?: number) => void;
    setVisible?: (value: boolean) => void;
};

const detach = (obj: Poolable) => {
    obj.parentContainer?.remove(obj);
    obj.clearMask?.(false);
    obj.removeAll?.(false);
    if (obj.scene?.children.list.includes(obj)) obj.scene.children.remove(obj);
};

const resetCommon = (obj: Poolable) => {
    obj.setPosition?.(0, 0);
    obj.setVisible?.(false);
    obj.setAlpha?.(1);
    obj.setScale?.(1);
    obj.setRotation?.(0);
    obj.setFlip?.(false, false);
    obj.setFlipX?.(false);
    obj.setFlipY?.(false);
    obj.clearTint?.();
    obj.setBlendMode?.(BLEND_MODE_NORMAL as Phaser.BlendModes);
};

export const activatePooledObject = (
    scene: Phaser.Scene,
    obj: Phaser.GameObjects.GameObject,
) => {
    if (!scene.children.list.includes(obj)) scene.children.add(obj);
};

export const resetPooledContainer = (obj: Phaser.GameObjects.Container) => {
    detach(obj as Poolable);
    resetCommon(obj as Poolable);
};

export const resetPooledImage = (obj: Phaser.GameObjects.Image) => {
    detach(obj as Poolable);
    resetCommon(obj as Poolable);
};

export const resetPooledRope = (obj: Phaser.GameObjects.Rope) => {
    detach(obj as Poolable);
    resetCommon(obj as Poolable);
};

export const resetPooledGraphics = (obj: Phaser.GameObjects.Graphics) => {
    detach(obj as Poolable);
    obj.clear();
    resetCommon(obj as Poolable);
};
