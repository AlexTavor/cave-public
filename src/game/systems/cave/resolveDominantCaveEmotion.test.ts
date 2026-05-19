import { describe, expect, it } from "vitest";
import { resolveDominantCaveEmotion } from "./resolveDominantCaveEmotion";

describe("resolveDominantCaveEmotion", () => {
    it("resolves the expected precedence order", () => {
        expect(
            resolveDominantCaveEmotion({
                happiness: 0.1,
                sadness: 0.2,
                terror: 0.8,
                curiosity: 0.3,
                worry: 0.8,
            }),
        ).toBe("scared");
        expect(
            resolveDominantCaveEmotion({
                happiness: 0.2,
                sadness: 0.5,
                terror: 0.1,
                curiosity: 0.4,
                worry: 0.5,
            }),
        ).toBe("worried");
        expect(
            resolveDominantCaveEmotion({
                happiness: 0.6,
                sadness: 0.1,
                terror: 0.1,
                curiosity: 0.6,
                worry: 0.1,
            }),
        ).toBe("happy");
        expect(
            resolveDominantCaveEmotion({
                happiness: 0.2,
                sadness: 0.1,
                terror: 0.1,
                curiosity: 0.7,
                worry: 0.2,
            }),
        ).toBe("curious");
    });

    it("keeps sadness over happiness and curiosity when worry is lower", () => {
        expect(
            resolveDominantCaveEmotion({
                happiness: 0.2,
                sadness: 0.5,
                terror: 0.1,
                curiosity: 0.4,
                worry: 0.3,
            }),
        ).toBe("sad");
    });
});

