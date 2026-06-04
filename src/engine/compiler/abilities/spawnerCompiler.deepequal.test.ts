import { describe, expect, it, vi } from "vitest";
import { createBlueprint } from "../../test/factories";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { spawnerCompiler } from "./spawnerCompiler";

const makeDraft = (id = "parent") => createBlueprint(id, { components: {} });

const findRule = (draft: Blueprint, id: string) =>
    draft.components.behavior?.rules?.find((r) => r.id === id);

describe("spawnerCompiler (deep structural)", () => {
    it("builds the full SPAWN_BODY rule verbatim for an assignment trigger (no extras)", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "spawn",
                blueprintId: "bp_child",
                count: { base: 2, perBody: 0, multPerBody: 0 },
                mode: "spawn_body",
                target: "sys_world",
                parentOnSpawn: "none",
                forcedHabiti: [],
                triggers: ["assignment_complete"],
                conditions: [],
            },
            0,
        );

        // assignment_complete trigger -> exactly the assignment condition;
        // fully deterministic, so deep-equal the entire rule. This pins the id
        // template, sortKey, every condition token, and the two SPAWN_BODY
        // actions (blueprintId + target) with no parentId / forcedHabiti keys.
        expect(findRule(draft, "sys_spawner_bp_child_0")).toEqual({
            id: "sys_spawner_bp_child_0",
            sortKey: "sys_070",
            conditions: [
                {
                    id: "assignment_complete",
                    sortKey: "0",
                    tokens: [],
                    compiled: {
                        ">": [
                            {
                                var: "self.state.assignment_complete_pulse.value",
                            },
                            0,
                        ],
                    },
                },
            ],
            actions: [
                {
                    type: "SPAWN_BODY",
                    blueprintId: "bp_child",
                    target: "sys_world",
                },
                {
                    type: "SPAWN_BODY",
                    blueprintId: "bp_child",
                    target: "sys_world",
                },
            ],
        });
    });

    it("emits a single SPAWN action (no target) for mode 'spawn' with parent + forced habiti", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "ghost",
                blueprintId: "bp_ghost",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                target: "sys_world",
                parentOnSpawn: "self",
                forcedHabiti: ["human", "elf"],
                triggers: ["assignment_complete"],
                conditions: [],
            },
            5,
        );

        // mode 'spawn' -> SPAWN (no target field). parentOnSpawn 'self' adds
        // parentId; non-empty forcedHabiti adds forcedHabiti. Deep-equal proves
        // both buildSpawnExtras branches fire and the index is in the id.
        expect(findRule(draft, "sys_spawner_bp_ghost_5")).toEqual({
            id: "sys_spawner_bp_ghost_5",
            sortKey: "sys_070",
            conditions: [
                {
                    id: "assignment_complete",
                    sortKey: "0",
                    tokens: [],
                    compiled: {
                        ">": [
                            {
                                var: "self.state.assignment_complete_pulse.value",
                            },
                            0,
                        ],
                    },
                },
            ],
            actions: [
                {
                    type: "SPAWN",
                    blueprintId: "bp_ghost",
                    parentId: "self",
                    forcedHabiti: ["human", "elf"],
                },
            ],
        });
    });

    it("omits parentId when parentOnSpawn is 'none' and forcedHabiti when empty", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "plain",
                blueprintId: "bp_plain",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                target: "sys_world",
                parentOnSpawn: "none",
                forcedHabiti: [],
                triggers: ["assignment_complete"],
                conditions: [],
            },
            0,
        );

        // Drives buildSpawnExtras BOTH conditionals to their false branch:
        // no parentId key, no forcedHabiti key.
        expect(findRule(draft, "sys_spawner_bp_plain_0")?.actions).toEqual([
            { type: "SPAWN", blueprintId: "bp_plain" },
        ]);
    });

    it("defaults mode->spawn_body, target->sys_world, parentOnSpawn->none, triggers->cycle_complete", () => {
        // cycle present so the requiresCycleTrigger warn does not fire.
        const draft = createBlueprint("defaults", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });

        spawnerCompiler(
            draft,
            {
                id: "d",
                blueprintId: "bp_def",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                conditions: [],
            } as never,
            2,
        );

        // Omitting mode/target/parentOnSpawn/triggers must resolve to the
        // documented defaults: SPAWN_BODY to sys_world, cycle_complete gate.
        expect(findRule(draft, "sys_spawner_bp_def_2")).toEqual({
            id: "sys_spawner_bp_def_2",
            sortKey: "sys_070",
            conditions: [
                {
                    id: "cycle_complete",
                    sortKey: "0",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.value" },
                        { t: "op", v: ">=" },
                        { t: "ref", v: "self.state.cycle.max" },
                    ],
                },
                {
                    id: "cycle_has_max",
                    sortKey: "1",
                    tokens: [
                        { t: "ref", v: "self.state.cycle.max" },
                        { t: "op", v: ">" },
                        { t: "val", v: 0 },
                    ],
                },
            ],
            actions: [
                {
                    type: "SPAWN_BODY",
                    blueprintId: "bp_def",
                    target: "sys_world",
                },
            ],
        });
    });

    it("clamps count via Math.max(0, Math.floor(count.base)) and emits that many actions", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "frac",
                blueprintId: "bp_frac",
                count: { base: 3.9, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // 3.9 -> floor 3 -> exactly three actions (pins floor, not round/ceil).
        expect(findRule(draft, "sys_spawner_bp_frac_0")?.actions).toHaveLength(
            3,
        );
    });

    it("defaults count to 1 when count is undefined (count?.base ?? 1)", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "nocount",
                blueprintId: "bp_one",
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        expect(findRule(draft, "sys_spawner_bp_one_0")?.actions).toHaveLength(1);
    });

    it("produces no rule (and no behavior) when the floored count is 0", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "zero",
                blueprintId: "bp_zero",
                count: { base: 0.4, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // 0.4 -> floor 0 -> early return BEFORE touching behavior.
        expect(draft.components.behavior).toBeUndefined();
    });

    it("clamps a negative count to 0 and emits no rule", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "neg",
                blueprintId: "bp_neg",
                count: { base: -5, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // Math.max(0, -5) === 0 -> no rule (kills the `0` literal in Math.max).
        expect(draft.components.behavior).toBeUndefined();
    });

    it("warns and skips entirely when blueprintId is missing/blank", () => {
        const draft = makeDraft("host");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        spawnerCompiler(
            draft,
            {
                id: "blank",
                blueprintId: "   ",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // trim() empties the id -> warn with the draft id, then return: no rule.
        expect(warn).toHaveBeenCalledWith(
            "Spawner ability missing blueprintId on 'host'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("trims surrounding whitespace from a valid blueprintId before use", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "pad",
                blueprintId: "  bp_pad  ",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // The trimmed id flows into both the rule id and the SPAWN action.
        const rule = findRule(draft, "sys_spawner_bp_pad_0");
        expect(rule?.actions).toEqual([
            { type: "SPAWN", blueprintId: "bp_pad" },
        ]);
    });

    it("warns about a missing cycle when a cycle trigger is required and no cycle state exists", () => {
        const draft = makeDraft("nocycle");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        spawnerCompiler(
            draft,
            {
                id: "needs",
                blueprintId: "bp_kid",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["cycle_complete"],
                conditions: [],
            } as never,
            0,
        );

        // Warns, but still proceeds to build the rule (warn != return).
        expect(warn).toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'nocycle'.",
        );
        expect(findRule(draft, "sys_spawner_bp_kid_0")).toBeDefined();
        warn.mockRestore();
    });

    it("does NOT warn about a missing cycle when the trigger is assignment-only", () => {
        const draft = makeDraft("nocycle");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        spawnerCompiler(
            draft,
            {
                id: "asg",
                blueprintId: "bp_kid",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // requiresCycleTrigger false -> no cycle warning even without cycle.
        expect(warn).not.toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'nocycle'.",
        );
        warn.mockRestore();
    });

    it("does NOT warn when a cycle trigger is required and the cycle state is present", () => {
        const draft = createBlueprint("withcycle", {
            components: {
                state: { cycle: { value: 0, max: 10, visible: false } },
            },
        });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        spawnerCompiler(
            draft,
            {
                id: "ok",
                blueprintId: "bp_kid",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["cycle_complete"],
                conditions: [],
            } as never,
            0,
        );

        // Both sides of the `&&`: requiresCycleTrigger true AND cycle present
        // -> condition false -> no warning.
        expect(warn).not.toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'withcycle'.",
        );
        warn.mockRestore();
    });

    it("appends a structured-condition gate to the rule's conditions when conditions are present", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "gated",
                blueprintId: "bp_gate",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [
                    {
                        kind: "world_state_threshold",
                        key: "ready",
                        operator: ">=",
                        value: 1,
                    },
                ],
            } as never,
            0,
        );

        const rule = findRule(draft, "sys_spawner_bp_gate_0");
        // The gate's id/sortKey are nanoid/ulid (non-deterministic), so assert
        // its compiled expression and that it was pushed after the trigger.
        expect(rule?.conditions).toHaveLength(2);
        expect(rule?.conditions[1]).toMatchObject({
            tokens: [],
            compiled: { ">=": [{ var: "sys_world.state.ready.value" }, 1] },
        });
    });

    it("does NOT append a gate when conditions is empty (conditionGate is null)", () => {
        const draft = makeDraft();

        spawnerCompiler(
            draft,
            {
                id: "open",
                blueprintId: "bp_open",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        // Empty conditions -> compileStructuredConditionAllGate returns null ->
        // only the trigger condition remains.
        expect(findRule(draft, "sys_spawner_bp_open_0")?.conditions).toHaveLength(
            1,
        );
    });

    it("initialises behavior.rules when behavior exists but rules is undefined (??= RHS)", () => {
        // behavior present as a bare object, rules missing -> drives the
        // `draft.components.behavior.rules ??= []` assignment + array literal at
        // L79 (otherwise NoCoverage: the `components: {}` path fills rules at
        // L78 so L79's `[]` never evaluates). The rule must be the sole entry.
        const draft = createBlueprint("parent", {
            components: { behavior: {} as Blueprint["components"]["behavior"] },
        });

        spawnerCompiler(
            draft,
            {
                id: "s",
                blueprintId: "bp_c",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                triggers: ["assignment_complete"],
                conditions: [],
            } as never,
            0,
        );

        const rules = draft.components.behavior?.rules ?? [];
        expect(rules.map((r) => r.id)).toEqual(["sys_spawner_bp_c_0"]);
        expect(rules.every((r) => typeof r === "object" && r !== null)).toBe(
            true,
        );
    });

    it("defaults omitted triggers to ['cycle_complete'] (warns on missing cycle + gates on the cycle conditions)", () => {
        // triggers omitted -> the `config.triggers ?? ["cycle_complete"]`
        // default must be exactly ["cycle_complete"]. With no cycle state, that
        // makes requiresCycleTrigger true and fires the cycle warning, and the
        // built rule is gated on the cycle conditions. Mutating the default to
        // [] or [""] would silence the warn AND (for "") still fall back to the
        // cycle conditions, so the warn assertion is the discriminator.
        const draft = createBlueprint("nocyc", { components: {} });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        spawnerCompiler(
            draft,
            {
                id: "z",
                blueprintId: "bp_k",
                count: { base: 1, perBody: 0, multPerBody: 0 },
                mode: "spawn",
                conditions: [],
            } as never,
            0,
        );

        expect(warn).toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'nocyc'.",
        );
        expect(
            findRule(draft, "sys_spawner_bp_k_0")?.conditions.map((c) => c.id),
        ).toEqual(["cycle_complete", "cycle_has_max"]);
        warn.mockRestore();
    });

    it("safely handles an entirely missing blueprintId via optional chaining (no throw)", () => {
        const draft = makeDraft("host");
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        // blueprintId is undefined (not just blank). `config.blueprintId?.trim()`
        // must short-circuit to undefined; removing the `?.` would throw
        // "Cannot read properties of undefined". We assert the safe path: warn +
        // early return + no behavior, and that the call did not throw.
        expect(() =>
            spawnerCompiler(
                draft,
                {
                    id: "x",
                    count: { base: 1, perBody: 0, multPerBody: 0 },
                    mode: "spawn",
                    triggers: ["assignment_complete"],
                    conditions: [],
                } as never,
                0,
            ),
        ).not.toThrow();

        expect(warn).toHaveBeenCalledWith(
            "Spawner ability missing blueprintId on 'host'.",
        );
        expect(draft.components.behavior).toBeUndefined();
        warn.mockRestore();
    });

    it("safely reads the cycle-state guard when components is entirely absent (optional chaining)", () => {
        // No components object at all. `draft.components?.state?.cycle` must
        // short-circuit on the first `?.`; removing it would throw on undefined
        // components. The cycle warn fires (no cycle), then the rule still
        // builds onto freshly-defaulted components.
        const draft = {
            id: "nocomp",
            label: "nocomp",
            tags: [],
        } as unknown as Blueprint;
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(() =>
            spawnerCompiler(
                draft,
                {
                    id: "y",
                    blueprintId: "bp_kid",
                    count: { base: 1, perBody: 0, multPerBody: 0 },
                    mode: "spawn",
                    triggers: ["cycle_complete"],
                    conditions: [],
                } as never,
                0,
            ),
        ).not.toThrow();

        expect(warn).toHaveBeenCalledWith(
            "Spawner ability requires cycle on 'nocomp'.",
        );
        expect(findRule(draft, "sys_spawner_bp_kid_0")?.actions).toEqual([
            { type: "SPAWN", blueprintId: "bp_kid" },
        ]);
        warn.mockRestore();
    });
});
