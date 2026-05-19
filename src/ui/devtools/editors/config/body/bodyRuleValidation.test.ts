import { describe, expect, it } from "vitest";
import {
    getHabitusPoolSuggestions,
    validateHabitusTypeRuleTypeChange,
    validateWeightedPoolEntries,
} from "./bodyRuleValidation";

const habitusIndex = {
    alpha: { id: "alpha", label: "Alpha", type: "species" },
    beta: { id: "beta", label: "Beta", type: "gender" },
    gamma: { id: "gamma", label: "Gamma", type: "species" },
} as any;

describe("bodyRuleValidation", () => {
    it("rejects duplicate rule types", () => {
        expect(
            validateHabitusTypeRuleTypeChange(
                [{ habitusType: "species" }, { habitusType: "gender" }] as any,
                0,
                "gender",
            ),
        ).toEqual({ success: false, reason: "duplicate" });
    });

    it("suggests and validates weighted pool entries by habitus type", () => {
        expect(getHabitusPoolSuggestions(habitusIndex, "species")).toEqual([
            "alpha",
            "gamma",
        ]);
        expect(
            validateWeightedPoolEntries({
                entries: [
                    { habitusId: "alpha", weight: 1 },
                    { habitusId: "alpha", weight: 2 },
                    { habitusId: "beta", weight: 1 },
                    { habitusId: "missing", weight: 1 },
                ],
                habitusIndex,
                habitusType: "species",
            }),
        ).toMatchObject({
            validEntries: [{ habitusId: "alpha", weight: 1 }],
            duplicateIds: ["alpha"],
            incompatibleIds: ["beta"],
            unknownIds: ["missing"],
        });
    });
});
