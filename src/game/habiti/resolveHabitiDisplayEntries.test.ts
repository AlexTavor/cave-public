import { describe, expect, it } from "vitest";
import { resolveHabitiDisplayEntries } from "./resolveHabitiDisplayEntries";

const habitusIndex = {
    human: {
        id: "human",
        label: "Human",
        description: "Regular human.",
        summary: "Deepens my memory.",
        type: "species",
        effects: [
            {
                type: "add_absorption_xp_conversion",
                amount: 0.05,
                description: "+5% absorption XP.",
            },
        ],
        excludes: [],
    },
} as const;

describe("resolveHabitiDisplayEntries", () => {
    it("suppresses cave-only text in body mode", () => {
        const [item] = resolveHabitiDisplayEntries({
            ids: ["human"],
            ownedHabiti: ["human"],
            habitusIndex: habitusIndex as any,
            mode: "body",
        });
        expect(item).toMatchObject({
            label: "Human",
            description: "Regular human.",
            summary: "",
            effectDescriptions: [],
            isOwnedByCave: true,
        });
    });

    it("returns authored summary and effect text in cave mode", () => {
        const [known, unknown] = resolveHabitiDisplayEntries({
            ids: ["human", "missing"],
            ownedHabiti: ["human"],
            habitusIndex: habitusIndex as any,
            mode: "cave",
        });
        expect(known).toMatchObject({
            label: "Human",
            summary: "Deepens my memory.",
            effectDescriptions: ["+5% absorption XP."],
            isOwnedByCave: true,
        });
        expect(unknown).toMatchObject({
            id: "missing",
            label: "missing",
            description: "",
            summary: "",
            effectDescriptions: [],
            isOwnedByCave: false,
        });
    });
});
