import { describe, expect, it } from "vitest";
import { assignBodyHabiti } from "./assignBodyHabiti";

const habitusIndex = {
    man: { id: "man", label: "Man", type: "gender", effects: [], excludes: [] },
    woman: {
        id: "woman",
        label: "Woman",
        type: "gender",
        effects: [],
        excludes: [],
    },
} as const;

describe("assignBodyHabiti maxCount", () => {
    it("does not add another habitus of the same type when existing habiti already hit maxCount", () => {
        expect(
            assignBodyHabiti({
                identitySerial: 3,
                existingHabiti: ["man"],
                settings: {
                    habitusTypeRules: [
                        {
                            habitusType: "gender",
                            probability: 1,
                            maxCount: 1,
                            weightedPool: [{ habitusId: "woman", weight: 1 }],
                        },
                    ],
                },
                habitusIndex: habitusIndex as any,
            }),
        ).toEqual(["man"]);
    });
});
