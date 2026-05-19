import { z } from "zod";

export const DEFAULT_VEIN_MEANDER = {
    point_count_min: 0,
    point_count_max: 4,
    offset_min_px: 20,
    offset_max_px: 100,
};

export const DEFAULT_VEIN_GEOMETRY = {
    waviness_per_meter: 0.5,
    waviness_simplex_scale: 6,
    segments_per_meter: 16,
    meander: DEFAULT_VEIN_MEANDER,
};

const finiteNonNegative = () => z.number().min(0).refine(Number.isFinite);
const finiteInteger = () => z.number().int().min(0).refine(Number.isFinite);

const VeinMeanderSchema = z
    .object({
        point_count_min: finiteInteger().default(0),
        point_count_max: finiteInteger().default(4),
        offset_min_px: finiteNonNegative().default(20),
        offset_max_px: finiteNonNegative().default(100),
    })
    .superRefine((value, ctx) => {
        if (value.point_count_max < value.point_count_min) {
            ctx.addIssue({
                code: "custom",
                message: "point_count_max must be >= point_count_min",
            });
        }
        if (value.offset_max_px < value.offset_min_px) {
            ctx.addIssue({
                code: "custom",
                message: "offset_max_px must be >= offset_min_px",
            });
        }
    })
    .default(DEFAULT_VEIN_MEANDER);

export const VeinGeometrySchema = z.object({
    waviness_per_meter: finiteNonNegative().default(0.5),
    waviness_simplex_scale: finiteNonNegative().default(6),
    segments_per_meter: z.number().min(1).refine(Number.isFinite).default(16),
    meander: VeinMeanderSchema,
});

export type VeinGeometry = z.infer<typeof VeinGeometrySchema>;
