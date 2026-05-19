import { describe, expect, it } from "vitest";
import { toCaveModule, toSemanticFragment } from "./semanticModuleFragments";

describe("semanticModuleFragments understanding", () => {
    it("round-trips understanding through cave modules", () => {
        const moduleData = toCaveModule("modules/core.cave", {
            understanding: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "Sees deeper.",
                    effects: [
                        {
                            type: "add_cave_attribute",
                            attribute: "mind",
                            amount: 1,
                        },
                    ],
                },
            },
        });

        expect(moduleData.config?.understanding?.insight?.label).toBe(
            "Insight",
        );
        expect(
            toSemanticFragment("modules/core.cave", moduleData),
        ).toMatchObject({
            understanding: { insight: { id: "insight", label: "Insight" } },
        });
    });
});
