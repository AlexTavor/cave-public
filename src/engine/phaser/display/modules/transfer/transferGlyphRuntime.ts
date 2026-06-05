import type Phaser from "phaser";
import type { DisplayDestroyContext, DisplayTickContext } from "../../types";
import type { GlyphRegistry } from "../../glyph/GlyphRegistry";
import type { GlyphShape } from "../../../../../data/schemas/assets/GlyphTypes";
import { GLYPH_POSITION_COORDS } from "../../../../../data/schemas/assets/GlyphTypes";
import { resolveGlyphPlacementTransform } from "../../glyph/glyphRenderMath";
import { BLEND_MODE_NORMAL } from "../../blendModes";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";
import {
    readTransferRender,
    resolveTransferRadius,
} from "./transferDisplayHelpers";
import { readDisplayDefaultLineThickness } from "../../../../../lib/displays/displayDefaultLineThickness";
import {
    clearGlyphImageState,
    hideGlyphImage,
    syncGlyphImage,
} from "../glyph/glyphImageState";

const DEG_TO_RAD = Math.PI / 180;
type Img = Phaser.GameObjects.Image;

const readRuntime = (scene: DisplayTickContext["scene"]) => {
    if (!scene) return null;
    const candidate = scene as unknown as {
        readRuntime?: () => unknown;
    };
    return typeof candidate.readRuntime === "function"
        ? candidate.readRuntime()
        : null;
};

const readGlyphTexture = (
    ctx: DisplayTickContext,
    color: string,
    thickness: number,
    shape: GlyphShape,
) =>
    ctx.textureManager.getGlyphTexture?.({ shape, color, thickness }) ??
    `${shape}:${color}:${thickness}`;

export const tickTransferGlyph = (
    ctx: DisplayTickContext,
    registry: GlyphRegistry,
    images: Img[],
): void => {
    const render = readTransferRender(ctx.entity);
    const radius = resolveTransferRadius(ctx.entity, render?.baseRadius ?? 0);
    if (!isRadiusVisible(radius) || render?.mode !== "pretty") {
        images.forEach((image) => hideGlyphImage(image));
        return;
    }
    const glyph = registry.get(render.glyphPresetKey);
    const tint = Number.parseInt(render.glyphColor.slice(1), 16);
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
    for (let i = 0; i < GLYPH_POSITION_COORDS.length; i++) {
        if (i >= glyph.placements.length) {
            hideGlyphImage(images[i]);
            continue;
        }
        const placement = glyph.placements[i];
        const delay = glyph.pulse.delayMsByPosition[placement.position];
        const pulse = Math.max(
            0,
            Math.min(
                1,
                ctx.pulseEngine.getDemandPulse(
                    ctx.spec.entityId,
                    ctx.timeMs - delay,
                ),
            ),
        );
        const transform = resolveGlyphPlacementTransform({
            radius,
            placement,
            pulse: glyph.pulse,
            pulseValue: pulse,
        });
        const thickness = placement.lineThickness ?? defaultLineThickness;
        syncGlyphImage(images[i], {
            textureKey: readGlyphTexture(
                ctx,
                "#ffffff",
                thickness,
                placement.shape,
            ),
            tint,
            alpha: 1,
            blendMode: BLEND_MODE_NORMAL,
            x: transform.xPx,
            y: transform.yPx,
            scale: transform.imageScale,
            rotation: transform.rotationDeg * DEG_TO_RAD,
            visible: true,
        });
    }
};

export const destroyTransferGlyph = (
    ctx: DisplayDestroyContext,
    images: Img[],
): void => {
    const pool = ctx.pools.get(ctx.spec.display_key).imagePool;
    for (const img of images) {
        clearGlyphImageState(img);
        ctx.scratch.root.remove(img);
        pool.release(img);
    }
    ctx.scratch.mainImage = null;
};
