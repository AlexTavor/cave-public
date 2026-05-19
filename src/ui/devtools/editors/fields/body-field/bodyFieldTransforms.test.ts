import { describe, it, expect } from "vitest";
import {
    clampAttribute,
    normalizeBaseAttributes,
    normalizePassport,
    parseTraitsInput,
    stringifyTraits,
} from "./bodyFieldTransforms";

describe("bodyFieldTransforms", () => {
    it("clamps attributes into range", () => {
        expect(clampAttribute(-5)).toBe(0);
        expect(clampAttribute(500)).toBe(500);
        expect(clampAttribute(1200)).toBe(999);
    });

    it("normalizes base attributes with defaults", () => {
        expect(normalizeBaseAttributes({})).toEqual({
            body: 1,
            mind: 1,
            social: 1,
        });
        expect(
            normalizeBaseAttributes({ body: 2, mind: 3, social: 4 }),
        ).toEqual({ body: 2, mind: 3, social: 4 });
    });

    it("normalizes passport fields", () => {
        expect(normalizePassport(undefined)).toEqual({
            name: "",
            description: "",
            portraitIcon: "",
        });
        expect(
            normalizePassport({
                name: "a",
                description: "b",
                portraitIcon: "c",
            }),
        ).toEqual({
            name: "a",
            description: "b",
            portraitIcon: "c",
        });
    });

    it("parses and stringifies traits", () => {
        const parsed = parseTraitsInput("fast, strong ,");
        expect(parsed).toEqual(["fast", "strong"]);
        expect(stringifyTraits(parsed)).toBe("fast, strong");
    });
});
