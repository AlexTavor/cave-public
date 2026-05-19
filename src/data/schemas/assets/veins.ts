import { z } from "zod";
import { DISPLAY_PALETTE_DEFAULT_COLORS } from "../../../lib/displays/displayKeyKinds";
import { LogicRuleSchema } from "../logic";
import { DEFAULT_VEIN_GEOMETRY, VeinGeometrySchema } from "./veinsGeometry";
import {
    DEFAULT_VEIN_HEARTBEAT,
    VeinHeartbeatSchema,
} from "./veinHeartbeatSchema";

export { DEFAULT_VEIN_HEARTBEAT } from "./veinHeartbeatSchema";

const HeartbeatRuleSchema = z.object({
    condition: LogicRuleSchema,
    preset: z.string(),
});

export const DEFAULT_VEIN_CONFIG = {
    thickness: {
        min_width: 2,
        max_width: 20,
        pulse_width_multiplier: 3,
        taper_start_width_multiplier_min: 1.1,
        taper_start_width_multiplier_max: 1.15,
        glow_width_multiplier: 1.6,
    },
    flow: {
        energy_per_blob: 10,
        min_blob_spacing_px: 18,
        base_blob_speed_px_per_sec: 120,
        blob_size_variance: 0.08,
        blob_spacing_variance: 0.08,
    },
    geometry: {
        ...DEFAULT_VEIN_GEOMETRY,
    },
    colors: {
        supply_dim_factor: 0.6,
        supply_bright_factor: 1.2,
        base_body: DISPLAY_PALETTE_DEFAULT_COLORS.body,
        base_mind: DISPLAY_PALETTE_DEFAULT_COLORS.mind,
        base_social: DISPLAY_PALETTE_DEFAULT_COLORS.social,
        base_nervous: "#9c27b0",
        base_assignable: "#000000",
        base_absorption: "#b71c1c",
        hue_variance_degrees: 4,
    },
    heartbeats: {
        blob_saturation_multiplier: 1.25,
        blob_saturation_variance: 0.08,
        default: "healthy",
        presets: { healthy: DEFAULT_VEIN_HEARTBEAT },
    },
};

const finitePositive = () => z.number().positive().refine(Number.isFinite);
const finiteAtLeastOne = () => z.number().min(1).refine(Number.isFinite);
const finiteVariance = () => z.number().min(0).max(1).refine(Number.isFinite);

export const VeinConfigSchema = z.object({
    thickness: z
        .object({
            min_width: z.number().default(2),
            max_width: z.number().default(20),
            pulse_width_multiplier: z.number().min(1).default(3),
            taper_start_width_multiplier_min: z.number().min(1).default(1.1),
            taper_start_width_multiplier_max: z.number().min(1).default(1.15),
            glow_width_multiplier: z.number().min(1).default(1.6),
        })
        .refine(
            (value) =>
                value.taper_start_width_multiplier_max >=
                value.taper_start_width_multiplier_min,
        )
        .default(DEFAULT_VEIN_CONFIG.thickness),
    flow: z
        .object({
            energy_per_blob: finitePositive().default(10),
            min_blob_spacing_px: finitePositive().default(18),
            base_blob_speed_px_per_sec: finitePositive().default(120),
            blob_size_variance: finiteVariance().default(0.08),
            blob_spacing_variance: finiteVariance().default(0.08),
        })
        .default(DEFAULT_VEIN_CONFIG.flow),
    geometry: VeinGeometrySchema.default(DEFAULT_VEIN_CONFIG.geometry),
    colors: z
        .object({
            supply_dim_factor: z.number().default(0.6),
            supply_bright_factor: z.number().default(1.2),
            base_body: z.string().default(DISPLAY_PALETTE_DEFAULT_COLORS.body),
            base_mind: z.string().default(DISPLAY_PALETTE_DEFAULT_COLORS.mind),
            base_social: z
                .string()
                .default(DISPLAY_PALETTE_DEFAULT_COLORS.social),
            base_nervous: z.string().default("#9c27b0"),
            base_assignable: z.string().default("#000000"),
            base_absorption: z.string().default("#b71c1c"),
            hue_variance_degrees: z.number().min(0).default(4),
        })
        .default(DEFAULT_VEIN_CONFIG.colors),
    heartbeats: z
        .object({
            blob_saturation_multiplier: finiteAtLeastOne().default(1.25),
            blob_saturation_variance: finiteVariance().default(0.08),
            default: z.string().default("healthy"),
            presets: z.record(z.string(), VeinHeartbeatSchema).default({
                healthy: DEFAULT_VEIN_HEARTBEAT,
            }),
            rules: z.array(HeartbeatRuleSchema).optional(),
        })
        .default(DEFAULT_VEIN_CONFIG.heartbeats),
});

export type VeinHeartbeat = z.infer<typeof VeinHeartbeatSchema>;
export type VeinConfig = z.infer<typeof VeinConfigSchema>;

