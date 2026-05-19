import { describe, expect, it } from "vitest";
import { VeinConfigSchema } from "./veins";

describe("VeinConfigSchema", () => {
    it("defaults the authored geometry contract", () => {
        const parsed = VeinConfigSchema.parse({});
        expect(parsed.geometry).toEqual({
            waviness_per_meter: 0.5,
            waviness_simplex_scale: 6,
            segments_per_meter: 16,
            meander: {
                point_count_min: 0,
                point_count_max: 4,
                offset_min_px: 20,
                offset_max_px: 100,
            },
        });
        expect(VeinConfigSchema.parse({ geometry: {} }).geometry).toEqual(
            parsed.geometry,
        );
    });

    it("rejects invalid flow and geometry primitives", () => {
        expect(() =>
            VeinConfigSchema.parse({ flow: { energy_per_blob: 0 } }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({ flow: { min_blob_spacing_px: -1 } }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({
                flow: { base_blob_speed_px_per_sec: Number.POSITIVE_INFINITY },
            }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({ geometry: { waviness_per_meter: -1 } }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({ geometry: { segments_per_meter: 0 } }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({
                geometry: { waviness_simplex_scale: -1 },
            }),
        ).toThrow();
    });

    it("rejects blob saturation multipliers below one", () => {
        expect(() =>
            VeinConfigSchema.parse({
                heartbeats: { blob_saturation_multiplier: 0.99 },
            }),
        ).toThrow();
    });

    it("rejects invalid taper and variance ranges", () => {
        expect(() =>
            VeinConfigSchema.parse({
                thickness: {
                    taper_start_width_multiplier_min: 1.2,
                    taper_start_width_multiplier_max: 1.1,
                },
            }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({ flow: { blob_size_variance: 1.1 } }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({ colors: { hue_variance_degrees: -1 } }),
        ).toThrow();
    });

    it("rejects invalid meander ranges", () => {
        expect(() =>
            VeinConfigSchema.parse({
                geometry: { meander: { point_count_min: -1 } },
            }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({
                geometry: { meander: { point_count_max: 1.5 } },
            }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({
                geometry: {
                    meander: { point_count_min: 2, point_count_max: 1 },
                },
            }),
        ).toThrow();
        expect(() =>
            VeinConfigSchema.parse({
                geometry: { meander: { offset_min_px: 6, offset_max_px: 5 } },
            }),
        ).toThrow();
    });
});
