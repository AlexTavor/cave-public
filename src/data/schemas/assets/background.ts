import { z } from "zod";

const finite = () => z.number().refine(Number.isFinite);
const finiteNonNegative = () => finite().min(0);
const finitePositive = () => finite().positive();

const DriftVectorSchema = z.object({
    x: finite(),
    y: finite(),
});

export const DEFAULT_BACKGROUND_CONFIG = {
    enabled: false,
    base_color: "#c092ee",
    lift_color: "#6810b0",
    intensity: 0.8,
    large_scale: 0.0028,
    small_scale: 0.0065,
    large_drift_per_ms: { x: 0.000025, y: -0.00001 },
    small_drift_per_ms: { x: -0.000013, y: 0.000018 },
    threshold_low: 0.3,
    threshold_high: 0.72,
    heartbeat_amplitude: 0.025,
};

export const BackgroundConfigSchema = z
    .object({
        enabled: z.boolean().default(false),
        base_color: z.string().default("#c092ee"),
        lift_color: z.string().default("#6810b0"),
        intensity: finiteNonNegative().default(0.8),
        large_scale: finitePositive().default(0.0028),
        small_scale: finitePositive().default(0.0065),
        large_drift_per_ms: DriftVectorSchema.default(
            DEFAULT_BACKGROUND_CONFIG.large_drift_per_ms,
        ),
        small_drift_per_ms: DriftVectorSchema.default(
            DEFAULT_BACKGROUND_CONFIG.small_drift_per_ms,
        ),
        threshold_low: finite().min(0).max(1).default(0.3),
        threshold_high: finite().min(0).max(1).default(0.72),
        heartbeat_amplitude: finiteNonNegative().default(0.025),
    })
    .superRefine((value, ctx) => {
        if (value.threshold_low < value.threshold_high) return;
        ctx.addIssue({
            code: "custom",
            message: "threshold_low must be less than threshold_high",
            path: ["threshold_low"],
        });
    });

export type BackgroundConfig = z.infer<typeof BackgroundConfigSchema>;
