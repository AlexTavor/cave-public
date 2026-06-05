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

    it("builds the complete body component (deep-equal incl. schema defaults)", () => {
        // Full structural assertion: catches the habiti [] / passport object /
        // description "" / name fallback construction in one shot, plus the
        // schema-applied defaults (xpRate, assignmentId, assignmentStatus).
        const draft = createBlueprint("avatar_bp", { components: {} });
        // draft.label === "avatar_bp" (factory sets label = id), so the
        // `draft.label ?? "Unknown"` branch keeps the label, not "Unknown".

        bodyCompiler(
            draft,
            makeConfig({
                baseAttributes: { body: 3, mind: 2, social: 4 },
                health: 80,
                xp: 12,
                level: 2,
            }),
        );

        expect(draft.components.body).toEqual({
            xp: 12,
            xpRate: 1,
            level: 2,
            baseAttributes: { body: 3, mind: 2, social: 4 },
            attributes: { body: 3, mind: 2, social: 4 },
            passport: { name: "avatar_bp", description: "" },
            traits: [],
            habiti: [],
            health: 80,
            maxHealth: 80,
            assignmentId: "sys_world",
            assignmentStatus: "orbiting",
        });
    });

    it("sets maxHealth equal to the configured health (not a different number)", () => {
        // Pins both health and maxHealth to the SAME source value so a swap to
        // a constant or to a different field is caught.
        const draft = createBlueprint("bp_test", { components: {} });

        bodyCompiler(draft, makeConfig({ health: 57 }));

        expect(draft.components.body?.health).toBe(57);
        expect(draft.components.body?.maxHealth).toBe(57);
    });

    it("falls back to the 'Unknown' passport name when the draft has no label", () => {
        // Removes draft.label so `draft.label ?? "Unknown"` takes the right-hand
        // literal -> passport.name === "Unknown".
        const draft = createBlueprint("bp_test", { components: {} });
        delete (draft as { label?: string }).label;

        bodyCompiler(draft, makeConfig());

        expect(draft.components.body?.passport).toEqual({
            name: "Unknown",
            description: "",
        });
    });

    it("preserves existing components (??= does not clobber a populated block)", () => {
        // components already holds a display; the `??=` must keep it. A swap to a
        // plain `=` would wipe the display before body is attached.
        const draft = createBlueprint("bp_test", {
            components: {
                display: { label: "Keep Me", display_key: "keep" },
            },
        });

        bodyCompiler(draft, makeConfig());

        expect(draft.components.display).toEqual({
            label: "Keep Me",
            display_key: "keep",
        });
        expect(draft.components.body).toBeDefined();
    });

    it("creates the body tag from scratch when draft.tags is not an array", () => {
        // tags is undefined -> the Array.isArray ternary takes the [] branch,
        // then "body" is pushed -> exactly ["body"].
        const draft = createBlueprint("bp_test", { components: {} });
        delete (draft as { tags?: string[] }).tags;

        bodyCompiler(draft, makeConfig());

        expect(draft.tags).toEqual(["body"]);
    });

    it("does NOT create a behavior block when config.rules is an empty array", () => {
        // config.rules is truthy but length === 0 -> the `&& length > 0` guard
        // is false, so no behavior component is added (drives L35 false side).
        const draft = createBlueprint("bp_test", { components: {} });

        bodyCompiler(draft, makeConfig({ rules: [] }));

        expect(draft.components.behavior).toBeUndefined();
    });

    it("does NOT create a behavior block when config.rules is omitted", () => {
        // config.rules is undefined -> the left side of the && short-circuits.
        const draft = createBlueprint("bp_test", { components: {} });

        bodyCompiler(draft, makeConfig({ rules: undefined }));

        expect(draft.components.behavior).toBeUndefined();
    });

    it("appends to a pre-existing behavior block that has no rules array", () => {
        // behavior present but rules absent + config.rules non-empty -> the
        // `rules ??= []` guard must initialise the array before pushing.
        const rule = {
            id: "custom",
            sortKey: "0",
            conditions: [],
            actions: [{ type: "KILL" as const, entityId: "self" }],
        };
        const draft = createBlueprint("bp_test", {
            components: { behavior: {} as { rules?: unknown[] } },
        });

        bodyCompiler(draft, makeConfig({ rules: [rule] }));

        expect(draft.components.behavior?.rules).toHaveLength(1);
        expect(draft.components.behavior?.rules?.[0].id).toBe("custom");
    });
});
