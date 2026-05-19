import {
    resolveAttributePoolKey,
    resolvePowerShape,
} from "../display/modules/attribute/attributePowerVisuals";
import type { DisplayRenderHostScene } from "./DisplayRenderHostScene";
import { readPhaserTextureSource } from "./readPhaserTextureSource";

export const renderAttributeDisplayImage = (
    scene: DisplayRenderHostScene,
    displayKey: string,
    canvas: HTMLCanvasElement,
): string => {
    const attribute = resolveAttributePoolKey(displayKey);
    if (attribute === null) {
        const message = `[DisplayImageExport] Unsupported display key: ${displayKey}`;
        console.error(message);
        throw new Error(message);
    }
    const textureManager = scene.textureManager;
    if (textureManager === undefined) {
        const message = "[DisplayImageExport] Missing texture manager.";
        console.error(message);
        throw new Error(message);
    }
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
        const message = "[DisplayImageExport] Missing canvas 2d context.";
        console.error(message);
        throw new Error(message);
    }
    const key = textureManager.getShapeTexture({
        shape: resolvePowerShape(attribute),
        color: "#ffffff",
    });
    const image = readPhaserTextureSource(scene, key);
    canvas.width = (image as { width?: number }).width ?? 128;
    canvas.height = (image as { height?: number }).height ?? 128;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL();
};
