import { describe, expect, it } from "vitest";
import type { BodyCardData } from "./bodyCardTypes";
import { bodyCardDataEqual } from "./bodyCardHydration";

const makeData = (): BodyCardData => ({
    subjectId: "body-1",
    isPermanent: true,
    showIdentityTitle: true,
    displayName: "Alden",
    description: "A body.",
    fallbackIconId: "worker",
    level: 2,
    xpMax: 250,
    xpRate: 1,
    baseAttributes: { body: 2, mind: 2, social: 1 },
    attributes: { body: 3, mind: 2, social: 1 },
    modifiers: [],
    traits: [],
    habiti: [],
});

describe("bodyCardDataEqual", () => {
    it("treats unchanged structural data as equal", () => {
        expect(bodyCardDataEqual(makeData(), makeData())).toBe(true);
    });

    it("detects structural xp-rate and attribute changes", () => {
        const left = makeData();
        expect(bodyCardDataEqual(left, { ...left, xpRate: 2 })).toBe(false);
        expect(
            bodyCardDataEqual(left, {
                ...left,
                baseAttributes: { ...left.baseAttributes, body: 3 },
            }),
        ).toBe(false);
        expect(
            bodyCardDataEqual(left, {
                ...left,
                attributes: { ...left.attributes, body: 4 },
            }),
        ).toBe(false);
    });
});
