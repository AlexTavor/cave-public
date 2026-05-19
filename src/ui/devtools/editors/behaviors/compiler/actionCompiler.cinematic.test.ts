import { describe, expect, it } from "vitest";
import { compileActionSequence } from "./actionCompiler";
import { parseShowCinematicAction } from "./actionCompiler.cinematic";

describe("actionCompiler cinematic", () => {
    it("parses quoted cinematic lines", () => {
        expect(parseShowCinematicAction('SHOW_CINEMATIC "A", "B"')).toEqual({
            type: "SHOW_CINEMATIC",
            lines: ["A", "B"],
        });
    });

    it("preserves spaces and punctuation inside quotes", () => {
        expect(
            compileActionSequence('SHOW_CINEMATIC "A, and B." AND KILL self'),
        ).toEqual([
            { type: "SHOW_CINEMATIC", lines: ["A, and B."] },
            { type: "KILL", entityId: "self" },
        ]);
    });

    it("rejects malformed cinematic input", () => {
        expect(() => parseShowCinematicAction("SHOW_CINEMATIC")).toThrow(
            "SHOW_CINEMATIC requires at least one line.",
        );
        expect(() => parseShowCinematicAction("SHOW_CINEMATIC nope")).toThrow(
            "SHOW_CINEMATIC must use comma-separated quoted lines.",
        );
    });
});
