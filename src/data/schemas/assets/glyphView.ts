import { z } from "zod";

export const DEFAULT_GLYPH_VIEW_CONFIG = {
    defaultLineThickness: 10,
};

export const GlyphViewConfigSchema = z.object({
    defaultLineThickness: z.number().positive().default(10),
});

export type GlyphViewConfig = z.infer<typeof GlyphViewConfigSchema>;
