import { describe, expect, it } from "vitest";
import { LinkerValidationError } from "./errors";
import { parseSemanticFragment } from "./semanticParser";

describe("parseSemanticFragment blueprints", () => {
    it("parses wrapped .bp files with blueprints envelope", () => {
        const bp = parseSemanticFragment("actors.bp", ".bp", {
            blueprints: {
                worker: {
                    label: "Worker",
                    components: { state: { hp: { value: 10 } } },
                },
            },
        });

        expect(bp.kind).toBe("bp");
        if (bp.kind !== "bp") return;
        expect(bp.data.worker.label).toBe("Worker");
        expect(bp.data.worker.components).toBeTruthy();
    });

    it("parses a single flat blueprint in BlueprintSchema format", () => {
        const bp = parseSemanticFragment("default_body.bp", ".bp", {
            id: "default_body",
            label: "Default Body",
            tags: [],
            components: { passiveEffects: [] },
            _editor: { abilities: {} },
        });

        expect(bp.kind).toBe("bp");
        if (bp.kind !== "bp") return;
        expect(bp.data.default_body.label).toBe("Default Body");
        expect(bp.data.default_body.tags).toEqual([]);
    });

    it("recovers stale hybrid blueprint templates", () => {
        const bp = parseSemanticFragment("what_am_i.bp", ".bp", {
            id: "what_am_i",
            label: "",
            components: {},
            blueprints: { what_am_i: { _editor: {} } },
        });

        expect(bp.kind).toBe("bp");
        if (bp.kind !== "bp") return;
        expect(bp.data.what_am_i.id).toBe("what_am_i");
        expect(bp.data.what_am_i._editor).toEqual({});
    });

    it("unwraps a single nested blueprint wrapper", () => {
        const bp = parseSemanticFragment("what_am_i.bp", ".bp", {
            wrapper: {
                metadata: { id: "what_am_i", name: "What Am I" },
                blueprints: { what_am_i: { label: "What Am I" } },
            },
        });

        expect(bp.kind).toBe("bp");
        if (bp.kind !== "bp") return;
        expect(bp.data.what_am_i.label).toBe("What Am I");
    });

    it("rejects deprecated notifications in .cave", () => {
        expect(() =>
            parseSemanticFragment("core.cave", ".cave", {
                notifications: [{ id: "notif-1" }],
            }),
        ).toThrow(LinkerValidationError);
    });
});
