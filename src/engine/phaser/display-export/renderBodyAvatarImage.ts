import {
    AVATAR_OUTLINE_SCALE,
    AVATAR_OUTLINE_TINT,
    AVATAR_SILHOUETTE_TINT,
    AVATAR_EYE_TINT,
} from "../display/avatar/AvatarDisplayConstants";
import type { BodyAvatarImageRequest } from "./DisplayImageExportTypes";
import type { DisplayRenderHostScene } from "./DisplayRenderHostScene";
import { drawTintedTexture } from "./drawTintedTexture";
import { readPhaserTextureSource } from "./readPhaserTextureSource";

export const renderBodyAvatarImage = (
    scene: DisplayRenderHostScene,
    inputs: BodyAvatarImageRequest,
    canvas: HTMLCanvasElement,
): string => {
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
        const message = "[DisplayImageExport] Missing canvas 2d context.";
        console.error(message);
        throw new Error(message);
    }
    canvas.width = 128;
    canvas.height = 128;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const textureManager = scene.textureManager;
    if (textureManager === undefined) {
        const message = "[DisplayImageExport] Missing texture manager.";
        console.error(message);
        throw new Error(message);
    }
    drawTintedTexture(
        ctx,
        readPhaserTextureSource(
            scene,
            textureManager.getAvatarGlowTexture(inputs.appearance),
        ),
        {
            tint: AVATAR_OUTLINE_TINT,
            x: 64,
            y: 64,
            scale: AVATAR_OUTLINE_SCALE,
        },
    );
    drawTintedTexture(
        ctx,
        readPhaserTextureSource(
            scene,
            textureManager.getAvatarSilhouetteTexture(inputs.appearance),
        ),
        {
            tint: AVATAR_SILHOUETTE_TINT,
            x: 64,
            y: 64,
            scale: 1,
        },
    );
    drawTintedTexture(
        ctx,
        readPhaserTextureSource(
            scene,
            textureManager.getAvatarEyesTexture(inputs.appearance),
        ),
        {
            tint: AVATAR_EYE_TINT,
            x: 64,
            y: 64,
            scale: 1,
        },
    );
    return canvas.toDataURL();
};
