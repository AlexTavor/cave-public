import { describe, expect, it } from "vitest";
import { EntityStyleSchema } from "./styles";

describe("EntityStyleSchema", () => {
    it("parses cycle progress and defaults family rotation", () => {
        expect(
            EntityStyleSchema.parse({
                cycleProgress: { family: "circle", color: "#ffffff" },
            }),
        ).toEqual({
            cycleProgress: {
                family: "circle",
                familyRotationDeg: 0,
                color: "#ffffff",
            },
        });
    });

    it("accepts family none and optional light", () => {
        expect(
            EntityStyleSchema.parse({
                cycleProgress: { family: "none", color: "#ffffff" },
                light: {
                    color: "#112233",
                    alpha: 0.5,
                    radiusFactor: 1.5,
                    blendMode: "ADD",
                },
            }),
        ).toMatchObject({ cycleProgress: { family: "none" } });
    });

    ["backgroundColor", "fillMode", "fillAmount", "invertFill"].forEach(
        (key) => {
            it(`rejects removed field ${key}`, () => {
                const parsed = EntityStyleSchema.safeParse({
                    cycleProgress: { family: "circle", color: "#ffffff" },
                    [key]: true,
                });
                expect(parsed.success).toBe(false);
            });
        },
    );

    it("rejects the legacy flat style shape", () => {
        const parsed = EntityStyleSchema.safeParse({
            shape: "rect",
            color: "#ffffff",
        });
        expect(parsed.success).toBe(false);
    });
});
