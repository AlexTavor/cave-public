import { describe, expect, it } from "vitest";
import { resolveStructuredFactAboutSuggestions } from "./structuredConditionAutocomplete";

describe("resolveStructuredFactAboutSuggestions", () => {
    it("returns cave status suggestions for cave_status fact types", () => {
        expect(
            resolveStructuredFactAboutSuggestions("cave_status", ["bp_a"]),
        ).toEqual(["food", "heat"]);
    });

    it("keeps world and blueprint suggestions for existing fact types", () => {
        expect(
            resolveStructuredFactAboutSuggestions("elapsed_real_seconds", [
                "bp_a",
            ]),
        ).toEqual(["world"]);
        expect(
            resolveStructuredFactAboutSuggestions("run_number", ["bp_a"]),
        ).toEqual(["world"]);
        expect(
            resolveStructuredFactAboutSuggestions("blueprint_spawned", [
                "bp_a",
            ]),
        ).toEqual(["bp_a"]);
    });

    it("returns understanding ids for understanding_owned fact types", () => {
        expect(
            resolveStructuredFactAboutSuggestions(
                "understanding_owned",
                ["bp_a"],
                [],
                [],
                [],
                ["insight", "vision"],
            ),
        ).toEqual(["insight", "vision"]);
    });
});
