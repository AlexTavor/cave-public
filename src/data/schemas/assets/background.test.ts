import { describe, expect, it } from "vitest";
import {
    BackgroundConfigSchema,
    DEFAULT_BACKGROUND_CONFIG,
} from "./background";

describe("BackgroundConfigSchema", () => {
    it("defaults an empty config to the declared contract", () => {
        expect(BackgroundConfigSchema.parse({})).toEqual(
            DEFAULT_BACKGROUND_CONFIG,
        );
    });

    it("rejects invalid scales and non-finite numeric values", () => {
        expect(() =>
            BackgroundConfigSchema.parse({ large_scale: 0 }),
        ).toThrow();
        expect(() =>
            BackgroundConfigSchema.parse({
                small_scale: Number.POSITIVE_INFINITY,
            }),
        ).toThrow();
        expect(() =>
            BackgroundConfigSchema.parse({ heartbeat_amplitude: -0.01 }),
        ).toThrow();
        expect(() => BackgroundConfigSchema.parse({ intensity: -1 })).toThrow();
    });

    it("rejects invalid threshold ordering", () => {
        expect(() =>
            BackgroundConfigSchema.parse({
                threshold_low: 0.7,
                threshold_high: 0.7,
            }),
        ).toThrow();
    });
});
