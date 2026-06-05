import { describe, it, expect, vi } from "vitest";
import { CompilerService } from "./CompilerService";
import { createBlueprint } from "../test/factories";
import type { Blueprint } from "../../data/schemas/blueprint";
import { Op } from "../../data/schemas/primitives";

const compile = (blueprint: Blueprint) =>
    new CompilerService().compile(blueprint);

describe("CompilerService", () => {
    it("returns a clone for legacy blueprints", () => {
        const blueprint = createBlueprint("legacy", { components: {} });
        const compiled = new CompilerService().compile(blueprint);

        expect(compiled).toEqual(blueprint);
        expect(compiled).not.toBe(blueprint);
    });

    it("generates cycle state, power, and behavior", () => {
        const blueprint = createBlueprint("cycler", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 100, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 10, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);

        expect(compiled.components.state?.cycle?.max).toBe(100);
        expect(compiled.components.powerSink?.baseDemand?.body).toBe(0);
        expect(compiled.components.passiveEffects?.length).toBeGreaterThan(0);

        const rule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_accumulate",
        );
        expect(rule).toBeTruthy();
        const action = rule?.actions?.[0];
        expect(action?.type).toBe("MUTATE");
        if (action?.type === "MUTATE") {
            expect(String(action.value)).toContain(
                "self.powerSink.allocatedDraw.body",
            );
        }

        const resetRule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_cycle_reset",
        );
        expect(resetRule).toBeTruthy();
    });

    it("compiles storage and production abilities", () => {
        const blueprint = createBlueprint("lumberjack", {
            components: {},
            _editor: {
                abilities: {
                    cycle: {
                        maxProgress: { base: 50, perBody: 0, multPerBody: 0 },
                        costMultPerCycle: 0,
                        inputs: {
                            body: { base: 10, perBody: 0, multPerBody: 0 },
                        },
                        oneOff: false,
                        conditions: [],
                    },
                    storage: [
                        {
                            resource: "wood",
                            capacity: { base: 100, perBody: 0, multPerBody: 0 },
                            isDefault: true,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    ],
                    production: [
                        {
                            resource: "wood",
                            amount: { base: 1, perBody: 0, multPerBody: 0 },
                            conditions: [],
                        },
                    ],
                },
            },
        });

        const compiled = new CompilerService().compile(blueprint);

        expect(compiled.components.state?.wood).toBeDefined();
        expect(compiled.tags).toContain("storage:wood");

        const produceRule = compiled.components.behavior?.rules?.find(
            (entry) => entry.id === "sys_produce_wood_0",
        );
        const produceAction = produceRule?.actions?.[1];
        expect(produceAction).toMatchObject({
            type: "TRANSFER",
            target: "tag:storage:wood",
            resource: "wood",
        });
    });

    // ---- behavior.rules cleanup filter (L30-37) ------------------------------

    it("strips sys_/body_ prefixed rules and keeps the rest (drives the filter both ways)", () => {
        const blueprint = createBlueprint("cleaner", {
            components: {
                behavior: {
                    rules: [
                        { id: "sys_alpha", sortKey: "a", conditions: [], actions: [] },
                        { id: "body_beta", sortKey: "b", conditions: [], actions: [] },
                        { id: "keepme", sortKey: "c", conditions: [], actions: [] },
                        { id: "another", sortKey: "d", conditions: [], actions: [] },
                        // a rule with NO id -> `rule.id?.startsWith` is undefined -> kept
                        { sortKey: "e", conditions: [], actions: [] },
                    ],
                },
            },
            _editor: { abilities: {} },
        });

        const compiled = compile(blueprint);

        // Exact surviving set: only the non-sys_/non-body_ ids (and the id-less rule)
        // survive. body_beta exercises the (nc) `!rule.id?.startsWith("body_")` clause:
        // it does NOT start with "sys_" so the && short-circuit reaches the body_ check.
        expect(compiled.components.behavior?.rules).toEqual([
            { id: "keepme", sortKey: "c", conditions: [], actions: [] },
            { id: "another", sortKey: "d", conditions: [], actions: [] },
            { sortKey: "e", conditions: [], actions: [] },
        ]);
    });

    it("keeps a body_-prefixed rule ALONE removed while a sibling sys_ rule is also removed", () => {
        // Isolating the body_ branch: if the && (L34) were flipped to ||, or the
        // body_ string/startsWith (L35) mutated, body_only would wrongly survive.
        const blueprint = createBlueprint("bodyonly", {
            components: {
                behavior: {
                    rules: [
                        { id: "body_only", sortKey: "x", conditions: [], actions: [] },
                        { id: "plain", sortKey: "y", conditions: [], actions: [] },
                    ],
                },
            },
            _editor: { abilities: {} },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "plain",
        ]);
    });

    it("does NOT run the rule filter for legacy blueprints (no _editor)", () => {
        // L28 guard: without _editor the whole compile body is skipped, so a
        // sys_ rule must survive untouched (this also pins L31 not running early).
        const blueprint = createBlueprint("legacy-rules", {
            components: {
                behavior: {
                    rules: [
                        { id: "sys_keep", sortKey: "k", conditions: [], actions: [] },
                    ],
                },
            },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.behavior?.rules?.map((r) => r.id)).toEqual([
            "sys_keep",
        ]);
    });

    it("leaves behavior untouched when there are no rules (L31 false branch)", () => {
        const blueprint = createBlueprint("emptybehavior", {
            components: { behavior: {} },
            _editor: { abilities: {} },
        });

        const compiled = compile(blueprint);

        // behavior present but `rules` undefined -> filter block skipped, no rules key added
        expect(compiled.components.behavior).toEqual({});
    });

    // ---- early-return guards on missing structure (L30 optional chain, L40) --

    it("survives a missing components object (L30 optional chaining)", () => {
        // No `components` at all: `draft.components?.behavior` must short-circuit.
        // Dropping the optional chain would throw here.
        const blueprint = {
            id: "raw",
            label: "raw",
            tags: [],
            _editor: { abilities: {} },
        } as unknown as Blueprint;

        expect(() => compile(blueprint)).not.toThrow();
        const compiled = compile(blueprint);
        expect(compiled.id).toBe("raw");
        expect(compiled.components).toBeUndefined();
    });

    it("returns early (no compilation) when _editor has no abilities (L40)", () => {
        // _editor present but `abilities` undefined -> L40 returns the clone as-is.
        const blueprint = {
            id: "noabilities",
            label: "noabilities",
            tags: [],
            components: {
                display: { label: "noabilities", display_key: "unknown" },
            },
            _editor: {},
        } as unknown as Blueprint;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const compiled = compile(blueprint);

        expect(compiled).toEqual(blueprint);
        expect(compiled).not.toBe(blueprint);
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    // ---- empty-abilities: every `?? []` default must stay empty (ArrayDecl) ---

    it("compiles a blueprint with an empty abilities object into no ability artifacts", () => {
        // Kills the ArrayDeclaration mutants on L50/54/63/67/71/75/82: if any
        // `?? []` became `?? ["Stryker was here"]`, the matching sub-compiler would
        // run on a string config and either console.warn or push a behavior rule.
        const blueprint = createBlueprint("bare", {
            components: {},
            _editor: { abilities: {} },
        });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const compiled = compile(blueprint);

        expect(warn).not.toHaveBeenCalled();
        expect(compiled.components.behavior).toBeUndefined();
        expect(compiled.components.buffs).toBeUndefined();
        expect(compiled.components.assignment).toBeUndefined();
        expect(compiled.components.spatial).toBeUndefined();
        expect(compiled.components.body).toBeUndefined();
        expect(compiled.tags).toEqual([]);
        warn.mockRestore();
    });

    // ---- body ability guards (L43 + L45 share `if (abilities.body)`) ---------

    it("compiles a body ability: sets the body component AND appends the health bar", () => {
        const blueprint = createBlueprint("worker", {
            // appendBodyHealthBar only augments an EXISTING display component
            // (bodyCompilerBar.ts returns early when none is present), so the
            // health bar can only be observed when the blueprint has a display.
            components: { display: { label: "worker", display_key: "unknown" } },
            _editor: {
                abilities: {
                    body: {
                        baseAttributes: { body: 1, mind: 1, social: 1 },
                        health: 100,
                        traits: [],
                        xp: 0,
                        level: 1,
                    },
                },
            },
        });

        const compiled = compile(blueprint);

        // L43 effect: body component + body tag
        expect(compiled.components.body).toBeDefined();
        expect(compiled.tags).toContain("body");
        // L45 effect: the body.health bar is appended to the display
        const healthBar = compiled.components.display?.bars?.find(
            (b) => b.key === "body.health",
        );
        expect(healthBar).toEqual({
            key: "body.health",
            maxKey: "body.maxHealth",
            color: "#4caf50",
            label: "Health",
        });
    });

    it("omits the body component and health bar when no body ability (L43/L45 false)", () => {
        const blueprint = createBlueprint("nobody", {
            components: {},
            _editor: { abilities: {} },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.body).toBeUndefined();
        expect(
            compiled.components.display?.bars?.some(
                (b) => b.key === "body.health",
            ) ?? false,
        ).toBe(false);
    });

    // ---- worldPresence guard (L46) -------------------------------------------

    it("compiles worldPresence into a spatial component (L46 true)", () => {
        const blueprint = createBlueprint("node", {
            components: {},
            _editor: {
                abilities: {
                    worldPresence: {
                        x: 7,
                        y: 9,
                        radius: { min: 10, max: 20 },
                    },
                },
            },
        });

        const compiled = compile(blueprint);

        // spatialCompiler routes authored coords through
        // resolveAuthoredWorldPosition, which adds the world-origin delta
        // (DEFAULT - AUTHORED = {x:2000, y:2000}), so 7/9 -> 2007/2009.
        expect(compiled.components.spatial).toEqual({
            x: 2007,
            y: 2009,
            radius: { min: 10, max: 20 },
        });
    });

    it("omits the spatial component when no worldPresence (L46 false)", () => {
        const blueprint = createBlueprint("flat", {
            components: {},
            _editor: { abilities: {} },
        });

        expect(compile(blueprint).components.spatial).toBeUndefined();
    });

    // ---- storage isPrimary == index 0 (L58-61) -------------------------------

    it("binds the display radius to the FIRST storage only (index === 0)", () => {
        // Two storages; the radius valueRef must come from storage[0] (wood), not
        // storage[1] (stone). Flipping `index === 0` to `!==`/true/false changes it.
        const blueprint = createBlueprint("tank", {
            components: {
                display: {
                    label: "tank",
                    display_key: "unknown",
                    radius: { min: 5, max: 30 },
                },
            },
            _editor: {
                abilities: {
                    storage: [
                        {
                            resource: "wood",
                            capacity: { base: 100, perBody: 0, multPerBody: 0 },
                            isDefault: true,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                        {
                            resource: "stone",
                            capacity: { base: 50, perBody: 0, multPerBody: 0 },
                            isDefault: false,
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            visible: true,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 0,
                        },
                    ],
                },
            },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.display?.radius?.valueRef).toBe(
            "self.state.wood.value",
        );
        expect(compiled.components.display?.radius?.maxRef).toBe(
            "self.state.wood.max",
        );
        // Both resources still get state entries (reconcile + forEach ran for both).
        expect(compiled.components.state?.wood).toBeDefined();
        expect(compiled.components.state?.stone).toBeDefined();
    });

    // ---- injection: `length > 0` guard + ArrayDecl (L75-77) ------------------

    it("compiles injection into a buffs component when present (L76 true)", () => {
        const blueprint = createBlueprint("emitter", {
            components: {},
            _editor: {
                abilities: {
                    injection: [
                        {
                            targetTag: "body",
                            effects: [
                                {
                                    op: Op.ADD,
                                    target: "self.state.mood.value",
                                    value: 3,
                                },
                            ],
                        },
                    ],
                },
            },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.buffs).toEqual({
            buffs: [
                {
                    targetTag: "body",
                    effects: [
                        {
                            op: Op.ADD,
                            target: "self.state.mood.value",
                            value: 3,
                        },
                    ],
                },
            ],
        });
    });

    it("does NOT create a buffs component when injection is absent (L75/L76 length boundary)", () => {
        // Empty/absent injection -> `[].length > 0` is false. If `>` became `>=`,
        // or the array default were non-empty, injectionCompiler would run and set
        // `buffs: { buffs: [...] }`.
        const blueprint = createBlueprint("noemit", {
            components: {},
            _editor: { abilities: {} },
        });

        expect(compile(blueprint).components.buffs).toBeUndefined();
    });

    // ---- assignment guards (L78-81) ------------------------------------------

    it("compiles an assignment ability into an assignment component (L79/L81 true)", () => {
        const blueprint = createBlueprint("station", {
            components: {},
            _editor: {
                abilities: {
                    assignment: { slots: 2, results: [] },
                },
            },
        });

        const compiled = compile(blueprint);

        expect(compiled.components.assignment).toBeDefined();
        expect(compiled.components.assignment?.slots).toBe(2);
        expect(compiled.components.assignment?.assignedIds).toEqual([]);
    });

    it("omits the assignment component when no assignment ability (L79/L81 false)", () => {
        const blueprint = createBlueprint("noslot", {
            components: {},
            _editor: { abilities: {} },
        });

        expect(compile(blueprint).components.assignment).toBeUndefined();
    });
});
