import { describe, it, expect } from "vitest";
import type { EntityAnalysisResult } from "./entityAnalysis.types";
import { analysisResultEqual } from "./analysisComparer";

const makeResult = (
    overrides: Partial<EntityAnalysisResult> = {},
): EntityAnalysisResult => ({
    modifiers: [],
    traits: [],
    ...overrides,
});

describe("analysisResultEqual", () => {
    it("returns true for identical references", () => {
        const a = makeResult();
        expect(analysisResultEqual(a, a)).toBe(true);
    });

    it("returns true for structurally identical results", () => {
        const a = makeResult({
            modifiers: [
                {
                    targetKey: "food",
                    valueStr: "-0.3",
                    intervalStr: "/s",
                    sourceType: "upkeep",
                    sourceId: "upkeep",
                },
            ],
        });
        const b = makeResult({
            modifiers: [
                {
                    targetKey: "food",
                    valueStr: "-0.3",
                    intervalStr: "/s",
                    sourceType: "upkeep",
                    sourceId: "upkeep",
                },
            ],
        });
        expect(analysisResultEqual(a, b)).toBe(true);
    });

    it("returns false when modifier counts differ", () => {
        const a = makeResult({ modifiers: [] });
        const b = makeResult({
            modifiers: [
                {
                    targetKey: "food",
                    valueStr: "-1",
                    sourceType: "upkeep",
                    sourceId: "upkeep",
                },
            ],
        });
        expect(analysisResultEqual(a, b)).toBe(false);
    });

    it("returns false when trait labels differ", () => {
        const a = makeResult({
            traits: [{ traitId: "t1", label: "A", effects: [] }],
        });
        const b = makeResult({
            traits: [{ traitId: "t1", label: "B", effects: [] }],
        });
        expect(analysisResultEqual(a, b)).toBe(false);
    });

    it("returns false when undefined vs value", () => {
        expect(analysisResultEqual(undefined, makeResult())).toBe(false);
    });
});
