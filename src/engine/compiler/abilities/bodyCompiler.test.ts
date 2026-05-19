import { describe, it, expect } from "vitest";
import { bodyCompiler } from "./bodyCompiler";
import { createBlueprint } from "../../test/factories";
import type { BodyAbilityConfig } from "../../../data/schemas/abilities/body";

const makeConfig = (
    overrides: Partial<BodyAbilityConfig> = {},
): BodyAbilityConfig => ({
    baseAttributes: { body: 1, mind: 1, social: 1 },
    health: 100,
    traits: [],
    xp: 0,
    level: 1,
    ...overrides,
});

describe("bodyCompiler", () => {
    it("sets body component with defaults", () => {
        const draft = createBlueprint("bp_test", { components: {} });
        bodyCompiler(draft, makeConfig());

        expect(draft.components.body).toMatchObject({
            xp: 0,
            level: 1,
            health: 100,
            maxHealth: 100,
        });
    });

    it("places traits into components.traits as TraitInstance[]", () => {
        const draft = createBlueprint("bp_test", { components: {} });
        bodyCompiler(draft, makeConfig({ traits: ["strong", "clever"] }));

        expect(draft.components.traits).toEqual([
            { id: "strong" },
            { id: "clever" },
        ]);
    });

    it("does not set components.traits when no traits given", () => {
        const draft = createBlueprint("bp_test", { components: {} });
        bodyCompiler(draft, makeConfig({ traits: [] }));

        expect(draft.components.traits).toBeUndefined();
    });

    it("body.traits is always an empty array", () => {
        const draft = createBlueprint("bp_test", { components: {} });
        bodyCompiler(draft, makeConfig({ traits: ["brave"] }));

        expect(draft.components.body!.traits).toEqual([]);
    });

    it("appends behavior rules from config", () => {
        const rule = {
            id: "custom",
            sortKey: "0",
            conditions: [],
            actions: [{ type: "KILL" as const, entityId: "self" }],
        };
        const draft = createBlueprint("bp_test", { components: {} });
        bodyCompiler(draft, makeConfig({ rules: [rule] }));

        expect(draft.components.behavior?.rules).toHaveLength(1);
        expect(draft.components.behavior?.rules?.[0].id).toBe("custom");
    });

    it("adds body tag when compiling a body ability", () => {
        const draft = createBlueprint("bp_test", { components: {}, tags: [] });

        bodyCompiler(draft, makeConfig());

        expect(draft.tags).toContain("body");
    });

    it("does not duplicate existing body tag", () => {
        const draft = createBlueprint("bp_test", {
            components: {},
            tags: ["body", "worker"],
        });

        bodyCompiler(draft, makeConfig());

        expect(draft.tags).toEqual(["body", "worker"]);
    });
});
