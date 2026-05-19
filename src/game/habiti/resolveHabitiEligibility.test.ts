import { describe, expect, it } from "vitest";
import { resolveHabitiEligibility } from "./resolveHabitiEligibility";

const habitusIndex = {
    human: {
        id: "human",
        label: "Human",
        type: "species",
        effects: [],
        excludes: ["moth"],
    },
    moth: {
        id: "moth",
        label: "Moth",
        type: "species",
        effects: [],
        excludes: [],
    },
    scarred: {
        id: "scarred",
        label: "Scarred",
        type: "unique_body",
        effects: [],
        excludes: ["human"],
    },
} as any;

describe("resolveHabitiEligibility", () => {
    it("rejects duplicates and both directions of exclusion", () => {
        expect(
            resolveHabitiEligibility({
                definition: habitusIndex.human,
                assignedHabiti: ["human"],
                habitusIndex,
            }),
        ).toBe(false);
        expect(
            resolveHabitiEligibility({
                definition: habitusIndex.moth,
                assignedHabiti: ["human"],
                habitusIndex,
            }),
        ).toBe(false);
        expect(
            resolveHabitiEligibility({
                definition: habitusIndex.human,
                assignedHabiti: ["scarred"],
                habitusIndex,
            }),
        ).toBe(false);
    });

    it("ignores unknown assigned Habiti ids without crashing", () => {
        expect(
            resolveHabitiEligibility({
                definition: habitusIndex.moth,
                assignedHabiti: ["missing"],
                habitusIndex,
            }),
        ).toBe(true);
    });
});
