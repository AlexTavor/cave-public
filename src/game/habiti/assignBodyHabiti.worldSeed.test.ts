import { describe, expect, it } from "vitest";
import { assignBodyHabiti } from "./assignBodyHabiti";

const settings = {
    habitusTypeRules: [
        {
            habitusType: "species",
            probability: 1,
            maxCount: 1,
            weightedPool: [
                { habitusId: "human", weight: 1 },
                { habitusId: "moth", weight: 1 },
                { habitusId: "wolf", weight: 1 },
            ],
        },
    ],
} as const;

const habitusIndex = {
    human: { id: "human", type: "species", excludes: [] },
    moth: { id: "moth", type: "species", excludes: [] },
    wolf: { id: "wolf", type: "species", excludes: [] },
} as const;

describe("assignBodyHabiti worldSeed", () => {
    it("changes deterministic picks between runs", () => {
        const runA = assignBodyHabiti({
            identitySerial: 4,
            worldSeed: "run-a",
            settings: settings as any,
            habitusIndex: habitusIndex as any,
        });
        const runB = assignBodyHabiti({
            identitySerial: 4,
            worldSeed: "run-b",
            settings: settings as any,
            habitusIndex: habitusIndex as any,
        });
        expect(runA).toEqual(
            assignBodyHabiti({
                identitySerial: 4,
                worldSeed: "run-a",
                settings: settings as any,
                habitusIndex: habitusIndex as any,
            }),
        );
        expect(runA).not.toEqual(runB);
    });
});
