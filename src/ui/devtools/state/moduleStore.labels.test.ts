import { describe, expect, it } from "vitest";
import {
    makeLabelIndex,
    normalizeLabel,
    suggestUniqueLabelForIndex,
    validateUniqueLabelForIndex,
} from "./moduleStore.labels";

describe("ui/devtools/state/moduleStore.labels", () => {
    it("normalizeLabel trims strings and coerces non-strings to empty", () => {
        expect(normalizeLabel("  hi  ")).toBe("hi");
        expect(normalizeLabel(123)).toBe("");
        expect(normalizeLabel(null)).toBe("");
    });

    it("makeLabelIndex builds a case-insensitive label -> id map (first wins)", () => {
        const headers: any = {
            entity_a: { id: "entity_a", label: "Alpha" },
            entity_b: { id: "entity_b", label: "  alpha  " },
            entity_c: { id: "entity_c", label: "Bravo" },
            entity_d: { id: "entity_d", label: "" },
        };

        const index = makeLabelIndex(headers);
        expect(index.alpha).toBe("entity_a");
        expect(index.bravo).toBe("entity_c");
        expect(index[""]).toBeUndefined();
    });

    it("validateUniqueLabelForIndex allows same id, rejects conflicts", () => {
        const labelToId = { alpha: "entity_a" };

        expect(
            validateUniqueLabelForIndex({
                labelToId,
                label: "Alpha",
                currentId: "entity_a",
            })
        ).toEqual({ ok: true });

        expect(
            validateUniqueLabelForIndex({
                labelToId,
                label: "ALPHA",
                currentId: "entity_b",
            })
        ).toEqual({ ok: false, existingId: "entity_a" });
    });

    it("suggestUniqueLabelForIndex produces Copy suffixes", () => {
        const labelToId = {
            "new entity": "entity_a",
            "new entity (copy)": "entity_b",
            "new entity (copy 2)": "entity_c",
        };

        expect(suggestUniqueLabelForIndex("New Entity", labelToId)).toBe(
            "New Entity (Copy 3)"
        );
    });
});
