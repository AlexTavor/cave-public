// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { useDraftPoolAutocomplete } from "./useDraftPoolAutocomplete";
import { renderHook } from "@testing-library/react";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";

const makeOption = (id: string, title: string): DraftOptionBlueprint => ({
    id,
    title,
    description: "",
    rarity: "none",
    icon: "unknown",
    payload: [],
});

const options: Record<string, DraftOptionBlueprint> = {
    opt_a: makeOption("opt_a", "Alpha"),
    opt_b: makeOption("opt_b", "Beta"),
    opt_c: makeOption("opt_c", "Charlie"),
};

describe("useDraftPoolAutocomplete", () => {
    it("returns all options when input is empty", () => {
        const { result } = renderHook(() =>
            useDraftPoolAutocomplete("", options),
        );
        expect(result.current).toHaveLength(3);
    });

    it("filters by input text", () => {
        const { result } = renderHook(() =>
            useDraftPoolAutocomplete("alpha", options),
        );
        expect(result.current).toHaveLength(1);
        expect(result.current[0].insertText).toBe("opt_a");
    });

    it("excludes already added ids", () => {
        const added = new Set(["opt_a", "opt_c"]);
        const { result } = renderHook(() =>
            useDraftPoolAutocomplete("", options, added),
        );
        expect(result.current).toHaveLength(1);
        expect(result.current[0].insertText).toBe("opt_b");
    });

    it("combines text filter and added-ids filter", () => {
        const added = new Set(["opt_b"]);
        const { result } = renderHook(() =>
            useDraftPoolAutocomplete("opt", options, added),
        );
        expect(result.current).toHaveLength(2);
        const ids = result.current.map((s) => s.insertText);
        expect(ids).not.toContain("opt_b");
    });
});
