import { z } from "zod";
import { DisplayAssetSchema } from "../../data/schemas/assets/displays";
import { GlyphPresetSchema } from "../../data/schemas/assets/glyphs";
import { EntityStyleSchema } from "../../data/schemas/assets/styles";
import { BackgroundConfigSchema } from "../../data/schemas/assets/background";
import { GlyphViewConfigSchema } from "../../data/schemas/assets/glyphView";
import { VeinConfigSchema } from "../../data/schemas/assets/veins";
import { normalizeLegacyArtInput } from "../../data/schemas/assets/normalizeLegacyArt";

export const SemanticArtSchema = z.preprocess(
    normalizeLegacyArtInput,
    z
        .object({
            displays: z.record(z.string(), DisplayAssetSchema).optional(),
            glyphs: z.record(z.string(), GlyphPresetSchema).optional(),
            styles: z.record(z.string(), EntityStyleSchema).optional(),
            settings: z
                .object({
                    background: BackgroundConfigSchema.optional(),
                    glyph_view: GlyphViewConfigSchema.optional(),
                    vein_network: VeinConfigSchema.optional(),
                })
                .optional(),
        })
        .strict(),
);

export type SemanticArtData = z.infer<typeof SemanticArtSchema>;
