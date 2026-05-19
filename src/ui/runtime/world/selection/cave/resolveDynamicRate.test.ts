import { describe, expect, it } from "vitest";
import { resolveDynamicRate } from "./resolveDynamicRate";

const buildEntity = (value: unknown, target = "self.state.food") => ({
    behavior: {
        rules: [
            {
                actions: [
                    {
                        type: "MUTATE",
                        op: "SUB",
                        target,
                        value,
                    },
                ],
            },
        ],
    },
});

describe("resolveDynamicRate", () => {
    it("uses numeric mutation values", () => {
        const entity = buildEntity(2.5);
        expect(resolveDynamicRate(entity, "food")).toBe(2.5);
    });

    it("extracts coefficients from expressions", () => {
        const entity = buildEntity("pop * 0.02 * dt / 1000");
        expect(resolveDynamicRate(entity, "food")).toBe(0.02);
    });

    it("returns zero when no matching rule exists", () => {
        const entity = buildEntity(1, "self.state.heat");
        expect(resolveDynamicRate(entity, "food")).toBe(0);
    });
});
