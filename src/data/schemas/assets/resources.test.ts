import { describe, expect, it } from "vitest";
import { ResourceVisualSchema } from "./resources";

const prettyVisual = {
    glyphPresetKey: "wood_glyph",
    glyphColor: "#ffcc00",
    light: {
        shape: "hex",
        color: "#ffaa00",
        alpha: 0.6,
        radiusFactor: 1.5,
        blendMode: "ADD",
    },
    particles: {
        shape: "circle",
        color: "#ffffff",
        speed: { min: 10, max: 20 },
        lifespan: 800,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.8, end: 0 },
        frequency: 40,
        quantity: 2,
        blendMode: "NORMAL",
    },
};

describe("ResourceVisualSchema", () => {
    it("accepts legacy resource visuals", () => {
        expect(ResourceVisualSchema.safeParse({ color: "#fff" }).success).toBe(true);
    });

    it("accepts a fully specified transferVisual", () => {
        expect(
            ResourceVisualSchema.safeParse({
                color: "#fff",
                radius: 5,
                effect: "glow",
                transferVisual: prettyVisual,
            }).success,
        ).toBe(true);
    });

    it("rejects invalid transfer visuals", () => {
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, light: { ...prettyVisual.light, shape: "bad" } } }).success).toBe(false);
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, light: { ...prettyVisual.light, blendMode: "BAD" } } }).success).toBe(false);
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, light: { ...prettyVisual.light, alpha: 1.2 } } }).success).toBe(false);
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, particles: { ...prettyVisual.particles, speed: { min: 4, max: 3 } } } }).success).toBe(false);
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, light: { ...prettyVisual.light, radiusFactor: 0 } } }).success).toBe(false);
        expect(ResourceVisualSchema.safeParse({ color: "#fff", transferVisual: { ...prettyVisual, particles: { ...prettyVisual.particles, lifespan: 0, quantity: 0 } } }).success).toBe(false);
    });
});