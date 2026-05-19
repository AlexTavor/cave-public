import { describe, expect, it } from "vitest";
import { pseudoRandom } from "./pseudoRandom";

describe("pseudoRandom", () => {
    it("returns the same value for the same seed", () => {
        // Given
        const seed = "deterministic-test-seed";

        // When
        const first = pseudoRandom(seed);
        const second = pseudoRandom(seed);

        // Then
        expect(first).toBe(second);
    });

    it("returns values within [0, 1) bounds", () => {
        // Given
        const seeds = [
            "alpha",
            "beta",
            "gamma",
            "delta",
            "epsilon",
            "",
            "a very long seed string with many characters",
            "12345",
            "!@#$%",
        ];

        // When / Then
        for (const seed of seeds) {
            const value = pseudoRandom(seed);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it("produces different values for different seeds", () => {
        // Given
        const seedA = "purge_kill_1";
        const seedB = "purge_kill_2";

        // When
        const valueA = pseudoRandom(seedA);
        const valueB = pseudoRandom(seedB);

        // Then
        expect(valueA).not.toBe(valueB);
    });
});
