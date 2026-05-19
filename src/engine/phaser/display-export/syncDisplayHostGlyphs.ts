import type { GlyphPreset } from "../../../data/schemas/assets";
import type { DisplayRenderHostScene } from "./DisplayRenderHostScene";

export const syncDisplayHostGlyphs = (
    scene: DisplayRenderHostScene,
    renderSeed: string,
    glyphs: Record<string, GlyphPreset> | null,
): void => {
    scene.glyphRegistry.syncEpoch(renderSeed, glyphs ?? {});
};
