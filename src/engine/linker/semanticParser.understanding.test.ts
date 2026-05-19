import { describe, expect, it } from "vitest";
import { parseSemanticFragment } from "./semanticParser";

describe("parseSemanticFragment understanding", () => {
    it("accepts top-level understanding in .cave files", () => {
        const cave = parseSemanticFragment("core.cave", ".cave", {
            understanding: {
                insight: {
                    id: "insight",
                    label: "Insight",
                    description: "Sees deeper.",
                    effects: [],
                },
            },
        });

        expect(cave.kind).toBe("cave");
        if (cave.kind !== "cave") return;
        const understanding = (
            cave.data as {
                understanding?: Record<string, { id: string; label: string }>;
            }
        ).understanding;
        expect(understanding?.insight).toMatchObject({
            id: "insight",
            label: "Insight",
        });
    });
});
