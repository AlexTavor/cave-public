import { describe, expect, it } from "vitest";
import { assignBodyHabiti } from "./assignBodyHabiti";

describe("assignBodyHabiti", () => {
    const habitusIndex = {
        human: {
            id: "human",
            label: "Human",
            type: "species",
            effects: [],
            excludes: [],
        },
        moth: {
            id: "moth",
            label: "Moth",
            type: "species",
            effects: [],
            excludes: [],
        },
        woman: {
            id: "woman",
            label: "Woman",
            type: "gender",
            effects: [],
            excludes: [],
        },
        scarred: {
            id: "scarred",
            label: "Scarred",
            type: "unique_body",
            effects: [],
            excludes: [],
        },
    } as any;

    it("uses only pool entries whose registry type matches the rule", () => {
        expect(
            assignBodyHabiti({
                identitySerial: 7,
                settings: {
                    habitusTypeRules: [
                        {
                            habitusType: "species",
                            probability: 1,
                            maxCount: 1,
                            weightedPool: [
                                { habitusId: "woman", weight: 1 },
                                { habitusId: "human", weight: 1 },
                            ],
                        },
                    ],
                },
                habitusIndex,
            }),
        ).toEqual(["human"]);
    });

    it("stops on the first miss and preserves existing Habiti", () => {
        expect(
            assignBodyHabiti({
                identitySerial: 1,
                existingHabiti: ["scarred"],
                settings: {
                    habitusTypeRules: [
                        {
                            habitusType: "gender",
                            probability: 0,
                            maxCount: 2,
                            weightedPool: [{ habitusId: "woman", weight: 1 }],
                        },
                    ],
                },
                habitusIndex,
            }),
        ).toEqual(["scarred"]);
    });

    it("selects deterministically and respects maxCount", () => {
        const result = assignBodyHabiti({
            identitySerial: 9,
            settings: {
                habitusTypeRules: [
                    {
                        habitusType: "species",
                        probability: 1,
                        maxCount: 2,
                        weightedPool: [
                            { habitusId: "human", weight: 1 },
                            { habitusId: "moth", weight: 5 },
                        ],
                    },
                ],
            },
            habitusIndex,
        });
        expect(result).toHaveLength(2);
        expect(result).toEqual(
            assignBodyHabiti({
                identitySerial: 9,
                settings: {
                    habitusTypeRules: [
                        {
                            habitusType: "species",
                            probability: 1,
                            maxCount: 2,
                            weightedPool: [
                                { habitusId: "human", weight: 1 },
                                { habitusId: "moth", weight: 5 },
                            ],
                        },
                    ],
                },
                habitusIndex,
            }),
        );
    });
});
