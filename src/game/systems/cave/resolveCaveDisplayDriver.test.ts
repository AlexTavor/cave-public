import { describe, expect, it } from "vitest";
import { resolveCaveDisplayDriver } from "./resolveCaveDisplayDriver";

const driver = {
    base: 10,
    comfortWeight: 2,
    focusWeight: -1,
    happinessWeight: 3,
    sadnessWeight: -2,
    terrorWeight: 4,
    curiosityWeight: 1,
    min: 5,
    max: 20,
};

describe("resolveCaveDisplayDriver", () => {
    it("applies weighted signal resolution", () => {
        expect(
            resolveCaveDisplayDriver(driver, 0.5, 0.25, 0.2, 0.1, 0.4, 0.3),
        ).toBeCloseTo(13.05);
    });

    it("clamps values to the configured maximum", () => {
        expect(resolveCaveDisplayDriver(driver, 1, 0, 1, 0, 1, 1)).toBe(20);
    });

    it("supports negative weights", () => {
        expect(resolveCaveDisplayDriver(driver, 0, 1, 0, 1, 0, 0)).toBe(7);
    });

    it("clamps values to the configured minimum", () => {
        expect(
            resolveCaveDisplayDriver({ ...driver, base: 1 }, 0, 1, 0, 1, 0, 0),
        ).toBe(5);
    });
});
