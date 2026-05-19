import { describe, expect, it } from "vitest";
import { requiresCycleAbility } from "./abilityTriggerValidation";

describe("requiresCycleAbility", () => {
    it("requires cycle when any entry includes cycle_complete", () => {
        expect(
            requiresCycleAbility([
                { triggers: ["assignment_complete"] },
                { triggers: ["assignment_complete"] },
            ]),
        ).toBe(false);
        expect(
            requiresCycleAbility([
                { triggers: ["assignment_complete"] },
                { triggers: ["cycle_complete"] },
            ]),
        ).toBe(true);
        expect(
            requiresCycleAbility([
                { triggers: ["cycle_complete", "assignment_complete"] },
            ]),
        ).toBe(true);
    });
});
