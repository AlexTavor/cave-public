import type { EntityStyle } from "../../../data/schemas/assets/styles";
import type { GlyphPaletteColors } from "../display/glyph/glyphPlacementColor";
import type { DisplayRenderHostScene } from "./DisplayRenderHostScene";
import { resolveCycleProgressVisual } from "../display/modules/cycle-progress/cycleProgressVisual";
import { resolveGlyphPlacementRenderModel } from "../display/modules/resolveGlyphPlacementRenderModel";
import { readPhaserTextureSource } from "./readPhaserTextureSource";
import { renderDisplayStyleLightCanvas } from "./renderDisplayStyleLightCanvas";
import { renderCycleProgressCanvas } from "./renderCycleProgressCanvas";
import {
    DISPLAY_IMAGE_CANVAS_CENTER,
    DISPLAY_IMAGE_CANVAS_SIZE,
    RESOLVED_DISPLAY_ICON_RADIUS,
    RESOLVED_DISPLAY_STATIC_PULSE_VALUE,
    RESOLVED_DISPLAY_STATIC_TIME_MS,
} from "./displayImageRenderConstants";

const drawGlyphs = (
    scene: DisplayRenderHostScene,
    ctx: CanvasRenderingContext2D,
    glyphKey: string,
    paletteColors: GlyphPaletteColors | undefined,
    defaultLineThickness: number,
) => {
    const glyph = scene.glyphRegistry.get(glyphKey);
    resolveGlyphPlacementRenderModel({
        glyph,
        radius: RESOLVED_DISPLAY_ICON_RADIUS,
        paletteColors,
        defaultLineThickness,
        readPulseValue: () => RESOLVED_DISPLAY_STATIC_PULSE_VALUE,
    }).forEach((instruction) => {
        const textureKey = scene.textureManager?.getGlyphTexture({
            shape: instruction.shape,
            color: instruction.color,
            thickness: instruction.thickness,
        });
        const image = readPhaserTextureSource(scene, textureKey ?? "");
        const size = DISPLAY_IMAGE_CANVAS_SIZE * instruction.imageScale;
        ctx.save();
        ctx.translate(
            DISPLAY_IMAGE_CANVAS_CENTER + instruction.xPx,
            DISPLAY_IMAGE_CANVAS_CENTER + instruction.yPx,
        );
        ctx.rotate((instruction.rotationDeg * Math.PI) / 180);
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        ctx.restore();
    });
};

const drawPlaceholder = (
    scene: DisplayRenderHostScene,
    ctx: CanvasRenderingContext2D,
    displayKey: string,
) => {
    const variant = scene.placeholderVariants.get(displayKey);
    if (!variant) return false;
    const image = readPhaserTextureSource(scene, variant.texture);
    if (!image) return false;
    ctx.save();
    ctx.translate(DISPLAY_IMAGE_CANVAS_CENTER, DISPLAY_IMAGE_CANVAS_CENTER);
    ctx.rotate((variant.rotation * Math.PI) / 180);
    ctx.scale(variant.flipX ? -1 : 1, 1);
    ctx.drawImage(image, -44, -44, 88, 88);
    ctx.restore();
    return true;
};

export const renderResolvedDisplayImage = (params: {
    scene: DisplayRenderHostScene;
    canvas: HTMLCanvasElement;
    displayKey: string;
    glyphKey: string;
    style: EntityStyle | null;
    paletteColors?: GlyphPaletteColors;
    defaultLineThickness?: number;
}): string => {
    const {
        scene,
        canvas,
        displayKey,
        glyphKey,
        style,
        paletteColors,
        defaultLineThickness = 10,
    } = params;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        throw new Error("[DisplayImageExport] Missing canvas 2d context.");
    canvas.width = DISPLAY_IMAGE_CANVAS_SIZE;
    canvas.height = DISPLAY_IMAGE_CANVAS_SIZE;
    ctx.clearRect(0, 0, DISPLAY_IMAGE_CANVAS_SIZE, DISPLAY_IMAGE_CANVAS_SIZE);
    renderDisplayStyleLightCanvas(ctx, style);
    const cycleRequest = style
        ? resolveCycleProgressVisual({
              entity: { state: { cycle: { value: 1, max: 1 } } },
              entityId: displayKey,
              radius: RESOLVED_DISPLAY_ICON_RADIUS,
              timeMs: RESOLVED_DISPLAY_STATIC_TIME_MS,
              pulseValue: RESOLVED_DISPLAY_STATIC_PULSE_VALUE,
              style,
              solidStripTextureKey: "display-export-solid-strip",
          }).ropeRequest
        : null;
    renderCycleProgressCanvas(ctx, cycleRequest);
    const resolvedGlyphKey = glyphKey || displayKey;
    const hasGlyph = Boolean(scene.glyphRegistry.get(resolvedGlyphKey));
    const hasStyleVisual = Boolean(style?.light) || Boolean(cycleRequest);
    if (hasGlyph)
        drawGlyphs(
            scene,
            ctx,
            resolvedGlyphKey,
            paletteColors,
            defaultLineThickness,
        );
    else if (!hasStyleVisual) drawPlaceholder(scene, ctx, displayKey);
    return canvas.toDataURL();
};
