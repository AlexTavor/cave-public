import { describe, expect, it } from "vitest";
import { resolveUnderstandingDisplayEntries } from "../understanding/resolveUnderstandingDisplayEntries";

describe("resolveUnderstandingDisplayEntries", () => {
    it("renders empty summaries and effect descriptions", () => {
        const entries = resolveUnderstandingDisplayEntries({
            ids: ["insight"],
            ownedUnderstanding: ["insight"],
            understandingIndex: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "Sees deeper.",
                    effects: [
                        {
                            type: "add_cave_attribute",
                            attribute: "mind",
                            amount: 1,
                            description: "+1 mind",
                        },
                    ],
                },
            },
        });

        expect(entries).toEqual([
            expect.objectContaining({
                id: "insight",
                summary: "",
                effectDescriptions: ["+1 mind"],
                isOwnedByCave: true,
            }),
        ]);
    });
});
