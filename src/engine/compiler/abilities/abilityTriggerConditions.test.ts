import { describe, expect, it } from "vitest";
import { buildAbilityTriggerConditions } from "./abilityTriggerConditions";

describe("buildAbilityTriggerConditions", () => {
    it("returns cycle conditions by default", () => {
        const conditions = buildAbilityTriggerConditions(["cycle_complete"]);
        expect(conditions).toHaveLength(2);
        expect(conditions[0]?.id).toBe("cycle_complete");
    });

    it("builds a combined OR condition when both triggers are present", () => {
        const conditions = buildAbilityTriggerConditions([
            "cycle_complete",
            "assignment_complete",
        ]);
        expect(conditions).toHaveLength(1);
        expect(conditions[0]?.id).toBe("cycle_or_assignment_complete");
        expect((conditions[0] as any).compiled?.or).toBeDefined();
    });
});
