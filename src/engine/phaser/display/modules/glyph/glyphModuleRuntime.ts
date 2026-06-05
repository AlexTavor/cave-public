import type Phaser from "phaser";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import type { GlyphShape } from "../../../../../data/schemas/assets/GlyphTypes";
import type { DisplayDestroyContext, DisplayTickContext } from "../../types";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import { BLEND_MODE_NORMAL } from "../../blendModes";
import { resolveGlyphPlacementRenderModel } from "../resolveGlyphPlacementRenderModel";
import { readDisplayDefaultLineThickness } from "../../../../../lib/displays/displayDefaultLineThickness";
import {
    clearGlyphImageState,
    hideGlyphImage,
    syncGlyphImage,
} from "./glyphImageState";

const DEG_TO_RAD = Math.PI / 180;
type Img = Phaser.GameObjects.Image;

const readGlyphTexture = (
    ctx: DisplayTickContext,
    params: { shape: GlyphShape; color: string; thickness: number },
) =>
    ctx.textureManager?.getGlyphTexture?.(params) ??
    `${params.shape}:${params.color}:${params.thickness}`;

const readRuntime = (scene: DisplayTickContext["scene"]) => {
    if (!scene) return null;
    const candidate = scene as DisplayTickContext["scene"] & {
        readRuntime?: () => unknown;
    };
    return typeof candidate.readRuntime === "function"
        ? candidate.readRuntime()
        : null;
};

export const tickGlyphImages = (
    ctx: DisplayTickContext,
    images: Img[],
    registry: GlyphRegistry,
): void => {
    if (!isRadiusVisible(ctx.spec.radius)) {
        images.forEach(hideGlyphImage);
        return;
    }
    const glyph = registry.get(ctx.spec.glyph_key ?? ctx.spec.display_key);
    const runtime = readRuntime(ctx.scene) as {
        getCartridge?: () => unknown;
    } | null;
    let defaultLineThickness = 10;
    if (runtime?.getCartridge) {
        defaultLineThickness = readDisplayDefaultLineThickness(
            runtime.getCartridge() as any,
            ctx.spec.display_asset_key ?? ctx.spec.display_key,
        );
    } else if (typeof registry.getDefaultLineThickness === "function") {
        defaultLineThickness = registry.getDefaultLineThickness();
    }
    const instructions = resolveGlyphPlacementRenderModel({
        glyph,
        radius: ctx.spec.radius,
        paletteColors: ctx.pulseEngine.getAllNodeColors?.(),
        defaultLineThickness,
        readPulseValue: (placement) =>
            ctx.pulseValue <= 0
                ? 0
                : ctx.pulseEngine.getDemandPulse(
                      ctx.spec.entityId,
                      ctx.timeMs -
                          glyph.pulse.delayMsByPosition[placement.position],
                  ),
    });
    for (let i = 0; i < images.length; i++) {
        const instruction = instructions[i];
        if (!instruction) {
            hideGlyphImage(images[i]);
            continue;
        }
        syncGlyphImage(images[i], {
            textureKey: readGlyphTexture(ctx, {
                shape: instruction.shape,
                color: instruction.color,
                thickness: instruction.thickness,
            }),
            tint: null,
            alpha: 1,
            blendMode: BLEND_MODE_NORMAL,
            x: instruction.xPx,
            y: instruction.yPx,
            scale: instruction.imageScale,
            rotation: instruction.rotationDeg * DEG_TO_RAD,
            visible: true,
        });
    }
};

export const destroyGlyphImages = (
    ctx: DisplayDestroyContext,
    images: Img[],
): void => {
    const pool = ctx.pools.get(ctx.spec.display_key).imagePool;
    images.forEach((img) => {
        clearGlyphImageState(img);
        ctx.scratch.root.remove(img);
        pool.release(img);
    });
    ctx.scratch.mainImage = null;
};
