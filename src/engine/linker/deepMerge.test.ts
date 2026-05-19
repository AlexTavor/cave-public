import { describe, expect, it } from "vitest";
import { deepMergeObjects } from "./deepMerge";

describe("deepMergeObjects", () => {
    it("recursively merges objects and replaces arrays", () => {
        const merged = deepMergeObjects(
            { a: { b: 1, c: [1, 2] }, keep: true },
            { a: { d: 2, c: [3] } },
        );
        expect(merged).toEqual({ a: { b: 1, c: [3], d: 2 }, keep: true });
    });

    it("applies null override and ignores undefined", () => {
        const merged = deepMergeObjects(
            { a: { b: 1 }, k: 5, n: 1 },
            { a: { b: undefined }, k: undefined, n: null },
        );
        expect(merged).toEqual({ a: { b: 1 }, k: 5, n: null });
    });
});
