import { describe, expect, it } from "vitest";
import {
    calculateLifetimeXp,
    resolveOutputAmount,
} from "./absorptionBatchOutputs";

const makeBody = (
    level: number,
    xp: number,
    body: number,
    mind: number,
    social: number,
) => ({
    level,
    xp,
    attributes: { body, mind, social },
    baseAttributes: { body, mind, social },
});

describe("absorptionBatchUtils", () => {
    it("resolves fixed outputs using the factor", () => {
        const body = makeBody(1, 0, 0, 0, 0);

        const amount = resolveOutputAmount(body as any, {
            resource: "edibles",
            source: "fixed",
            factor: 124,
        });

        expect(amount).toBe(124);
    });

    it("resolves attribute outputs using scaled attributes", () => {
        const body = makeBody(1, 0, 10, 0, 0);

        const amount = resolveOutputAmount(body as any, {
            resource: "power",
            source: "attribute",
            attribute: "body",
            factor: 2.5,
        });

        expect(amount).toBe(25);
    });

    it("resolves lifetime xp outputs from completed levels", () => {
        const body = makeBody(2, 10, 0, 0, 0);

        const total = calculateLifetimeXp(body as any);
        const amount = resolveOutputAmount(body as any, {
            resource: "essence",
            source: "lifetime_xp",
            factor: 0.5,
        });

        expect(total).toBe(110);
        expect(amount).toBe(55);
    });
});
