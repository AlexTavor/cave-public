import Phaser from "phaser";
import { GLYPH_GLOW_VERSION } from "./GlyphGlowStyle";
import type { GlyphShape } from "../../../../data/schemas/assets/GlyphTypes";
import { ALL_GLYPH_SHAPES } from "../../../../data/schemas/assets/GlyphTypes";
import { GLYPH_TEXTURE_SIZE } from "./glyphShapeDrawFnsRings";
import { resolveGlyphGlowPasses } from "./glyphGlowMath";
import { drawCoreGlyphShape } from "./glyphTextureDrawCore";
import { drawStrokeGlyphShape } from "./glyphTextureDrawStroke";

type GlyphTextureOptions = {
    shape: GlyphShape;
    color: string;
    thickness: number;
};

export const generateGlyphTextures = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
): void => {
    ALL_GLYPH_SHAPES.forEach((shape) =>
        generateGlyphTexture(scene, graphics, {
            shape,
            color: "#ffffff",
            thickness: 10,
        }),
    );
};

const normalizeThickness = (shape: GlyphShape, thickness: number) => {
    const ignoresThickness = new Set([
        "crescent",
        "hole",
        "triangle",
        "star5",
        "star6",
        "circle",
        "pixel",
        "triple_circle",
    ]);
    return ignoresThickness.has(shape) ? 0 : Math.max(1, Math.round(thickness));
};

export const generateGlyphTexture = (
    scene: Phaser.Scene,
    graphics: Phaser.GameObjects.Graphics,
    options: GlyphTextureOptions,
) => {
    const thickness = normalizeThickness(options.shape, options.thickness);
    const key = [
        "glyphtex",
        GLYPH_GLOW_VERSION,
        options.shape,
        options.color.toLowerCase(),
        thickness,
    ].join(":");
    if (scene.textures.exists(key)) return key;
    const color = Phaser.Display.Color.HexStringToColor(options.color).color;
    graphics.clear();
    for (const pass of resolveGlyphGlowPasses()) {
        graphics.fillStyle(color, pass.alpha);
        if (
            !drawCoreGlyphShape(
                graphics,
                options.shape,
                thickness || 10,
                color,
                pass.outsetPx,
                pass.alpha,
            ) &&
            !drawStrokeGlyphShape(
                graphics,
                options.shape,
                thickness || 10,
                color,
                pass.outsetPx,
                pass.alpha,
            )
        ) {
            throw new Error(
                `[GlyphTextureGen] Unsupported glyph shape: ${options.shape}`,
            );
        }
    }
    if (
        !drawCoreGlyphShape(
            graphics,
            options.shape,
            thickness || 10,
            color,
            0,
        ) &&
        !drawStrokeGlyphShape(
            graphics,
            options.shape,
            thickness || 10,
            color,
            0,
        )
    ) {
        throw new Error(
            `[GlyphTextureGen] Unsupported glyph shape: ${options.shape}`,
        );
    }
    graphics.generateTexture(key, GLYPH_TEXTURE_SIZE, GLYPH_TEXTURE_SIZE);
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
};
