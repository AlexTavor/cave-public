import { describe, expect, it, vi } from "vitest";
import { assignBodyHabiti } from "./assignBodyHabiti";

const habitusIndex = {
    human: { id: "human", type: "species", excludes: [] },
    wolf: { id: "wolf", type: "species", excludes: ["human"] },
} as any;

const settings = {
    habitusTypeRules: [
        {
            habitusType: "species",
            maxCount: 1,
            probability: 0,
            weightedPool: [{ habitusId: "human", weight: 1 }],
        },
    ],
} as any;

describe("assignBodyHabiti forced habiti", () => {
    it("seeds valid forced habiti before random selection", () => {
        const result = assignBodyHabiti({
            identitySerial: 1,
            settings,
            habitusIndex,
            forcedHabiti: ["human"],
        });
        expect(result).toEqual(["human"]);
    });

    it("keeps forced habiti even when no matching type rule exists", () => {
        const result = assignBodyHabiti({
            identitySerial: 1,
            settings: { habitusTypeRules: [] } as any,
            habitusIndex: {
                Hommleter: {
                    id: "Hommleter",
                    type: "social_category",
                    excludes: [],
                },
            } as any,
            forcedHabiti: ["Hommleter"],
        });
        expect(result).toEqual(["Hommleter"]);
    });

    it("reports invalid forced habiti", () => {
        const onInvalidForcedHabitusId = vi.fn();
        assignBodyHabiti({
            identitySerial: 1,
            settings,
            habitusIndex,
            forcedHabiti: ["human", "wolf", "missing"],
            onInvalidForcedHabitusId,
        });
        expect(onInvalidForcedHabitusId).toHaveBeenCalledTimes(2);
    });
});
