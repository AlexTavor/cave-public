import { z } from "zod";
import {
    DEFAULT_BACKGROUND_CONFIG,
    BackgroundConfigSchema,
} from "./background";
import { DisplayAssetSchema } from "./displays";
import { DEFAULT_GLYPH_VIEW_CONFIG, GlyphViewConfigSchema } from "./glyphView";
import { DEFAULT_VEIN_CONFIG, VeinConfigSchema } from "./veins";
import { GlyphPresetSchema } from "./glyphs";
import { EntityStyleSchema } from "./styles";
import { normalizeLegacyArtInput } from "./normalizeLegacyArt";

const AssetSettingsSchema = z.preprocess(
    (input) => {
        if (!input || typeof input !== "object") return input;
        const raw = input as Record<string, unknown>;
        return {
            ...raw,
            background: raw.background ?? DEFAULT_BACKGROUND_CONFIG,
            glyph_view: raw.glyph_view ?? DEFAULT_GLYPH_VIEW_CONFIG,
            vein_network: raw.vein_network ?? DEFAULT_VEIN_CONFIG,
        };
    },
    z
        .object({
            background: BackgroundConfigSchema.optional(),
            glyph_view: GlyphViewConfigSchema.optional(),
            vein_network: VeinConfigSchema.optional(),
        })
        .catchall(z.unknown())
        .default({
            background: DEFAULT_BACKGROUND_CONFIG,
            glyph_view: DEFAULT_GLYPH_VIEW_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        })
        .describe("ui:collapsed"),
);

export const AssetCollectionSchema = z.preprocess(
    normalizeLegacyArtInput,
    z
        .object({
            displays: z
                .record(z.string(), DisplayAssetSchema)
                .optional()
                .default({})
                .describe("ui:collapsed"),
            glyphs: z
                .record(z.string(), GlyphPresetSchema)
                .optional()
                .describe("ui:collapsed"),
            styles: z
                .record(z.string(), EntityStyleSchema)
                .optional()
                .describe("ui:collapsed"),
            settings: AssetSettingsSchema,
        })
        .catchall(z.unknown())
        .default({
            displays: {},
            glyphs: {},
            settings: {
                background: DEFAULT_BACKGROUND_CONFIG,
                glyph_view: DEFAULT_GLYPH_VIEW_CONFIG,
                vein_network: DEFAULT_VEIN_CONFIG,
            },
        }),
);

export type AssetCollection = z.infer<typeof AssetCollectionSchema>;

