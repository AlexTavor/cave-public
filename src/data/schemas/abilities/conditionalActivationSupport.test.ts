import { describe, expect, it } from "vitest";
import { isConditionalActivationTargetValid } from "./conditionalActivationSupport";

describe("isConditionalActivationTargetValid", () => {
    it("accepts assignment targets when the assignment ability exists", () => {
        expect(
            isConditionalActivationTargetValid(
                { assignment: { slots: 1, locking: false } },
                { ability: "assignment" },
            ),
        ).toBe(true);
    });

    it("accepts passport targets when the passport ability exists", () => {
        expect(
            isConditionalActivationTargetValid(
                { passport: { description: "Traveler." } },
                { ability: "passport" },
            ),
        ).toBe(true);
    });

    it("rejects passport targets when the passport ability is missing", () => {
        expect(
            isConditionalActivationTargetValid({}, { ability: "passport" }),
        ).toBe(false);
    });
});
