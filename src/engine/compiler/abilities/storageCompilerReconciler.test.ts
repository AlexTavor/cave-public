import { describe, expect, it } from "vitest";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { Op } from "../../../data/schemas/primitives";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { reconcileStorageCompilerArtifacts } from "./storageCompilerReconciler";

const compiler = new CompilerService();

const makeStorage = (
    overrides: Partial<StorageAbilityConfig> = {},
): StorageAbilityConfig => ({
    resource: "food",
    initialValue: 0,
    capacity: { base: 100, perBody: 1, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 1, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
    autoRequest: {
        enabled: true,
        cadence_s: 1,
        minRequest: 1,
        maxRequest: 10,
    },
    ...overrides,
});

const compileStorage = (storage: StorageAbilityConfig[]) =>
    compiler.compile(
        createBlueprint("store", {
            components: {},
            _editor: { abilities: { storage } },
        }),
    );

// A storage-owned state entry is any object carrying one of these keys.
const storageEntry = { value: 5, allowDeposit: true } as const;

describe("storageCompilerReconciler — integration (CompilerService)", () => {
    it("removes storage bars on the first compile after visibility is hidden", () => {
        const visible = compileStorage([makeStorage()]);
        const hidden = compiler.compile({
            ...visible,
            _editor: {
                abilities: { storage: [makeStorage({ visible: false })] },
            },
        } as any);

        expect(hidden.components.state?.food?.visible).toBe(false);
        expect(hidden.components.display?.bars ?? []).not.toContainEqual(
            expect.objectContaining({ key: "state.food" }),
        );
    });

    it("removes stale artifacts when storage resource changes", () => {
        const food = compileStorage([makeStorage()]);
        const heat = compiler.compile({
            ...food,
            _editor: {
                abilities: { storage: [makeStorage({ resource: "heat" })] },
            },
        } as any);

        expect(heat.components.state?.food).toBeUndefined();
        expect(Object.keys(heat.components.state ?? {})).not.toContain(
            "vals_storage_food_cap_0",
        );
        expect(heat.tags ?? []).not.toContain("storage:food");
        expect(heat.components.display?.bars ?? []).not.toContainEqual(
            expect.objectContaining({ key: "state.food" }),
        );
        expect(heat.components.state?.heat).toBeDefined();
    });

    it("removes stale entropy and auto-request artifacts when they are disabled", () => {
        const enabled = compileStorage([makeStorage()]);
        const disabled = compiler.compile({
            ...enabled,
            _editor: {
                abilities: {
                    storage: [
                        makeStorage({
                            entropy: { base: 0, perBody: 0, multPerBody: 0 },
                            autoRequest: undefined,
                        }),
                    ],
                },
            },
        } as any);

        expect(
            Object.keys(disabled.components.state ?? {}).some((key) =>
                key.startsWith("vals_entropy_food_"),
            ),
        ).toBe(false);
        expect(
            Object.keys(disabled.components.state ?? {}).some((key) =>
                key.startsWith("auto_req_food_"),
            ),
        ).toBe(false);
        expect(
            (disabled.components.passiveEffects ?? []).some(
                (effect) =>
                    JSON.stringify(effect).includes("entropy_food") ||
                    JSON.stringify(effect).includes("auto_req_food"),
            ),
        ).toBe(false);
        expect(
            (disabled.components.behavior?.rules ?? []).some((rule) =>
                rule.id?.startsWith("sys_auto_req_food_"),
            ),
        ).toBe(false);
    });
});

describe("reconcileStorageCompilerArtifacts — direct unit (full-structure)", () => {
    // The cleanup set is driven by the *config* resource list. With NO configs
    // and NO storage-owned state, nothing is touched: a clean no-op proves the
    // function only removes what a resource targets, not arbitrary content.
    it("is a no-op when there are no configs and no storage-owned state", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food", "keep-me"],
            components: {
                state: {
                    food: { value: 5, visible: true },
                    vals_storage_food_cap_0: { value: 100 },
                    vals_entropy_food_0: { value: 1 },
                },
                display: { label: "x", display_key: "k", bars: [{ key: "state.food" }] },
                passiveEffects: [
                    { op: Op.ADD, target: "self.state.vals_entropy_food_0", value: 1 },
                ],
                behavior: {
                    rules: [{ id: "sys_auto_req_food_need_0", sortKey: "a", conditions: [], actions: [] }],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, []);

        // `food` state entry is NOT storage-owned (no allow*/priority keys) and
        // there is no config naming it, so absolutely nothing is removed.
        expect(draft.tags).toEqual(["storage:food", "keep-me"]);
        expect(draft.components.state).toEqual({
            food: { value: 5, visible: true },
            vals_storage_food_cap_0: { value: 100 },
            vals_entropy_food_0: { value: 1 },
        });
        expect(draft.components.display?.bars).toEqual([{ key: "state.food" }]);
        expect(draft.components.passiveEffects).toEqual([
            { op: "ADD", target: "self.state.vals_entropy_food_0", value: 1 },
        ]);
        expect(draft.components.behavior?.rules).toEqual([
            { id: "sys_auto_req_food_need_0", sortKey: "a", conditions: [], actions: [] },
        ]);
    });

    it("strips EVERY artifact category for a config resource and leaves siblings intact", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food", "storage:heat", "decor"],
            components: {
                state: {
                    // storage-owned entry for the target resource -> removed via L65.
                    food: { ...storageEntry },
                    // a sibling storage-owned entry that is NOT a config resource
                    // but IS storage-owned -> picked up by L56-58 -> removed too.
                    heat: { value: 9, priority: 2 },
                    // prefixed state for food -> removed via L66.
                    vals_storage_food_cap_0: { value: 100 },
                    vals_entropy_food_0: { value: 1 },
                    vals_entropy_tick_food_0: { value: 1 },
                    auto_req_food_timer_0: { value: 0 },
                    auto_req_food_need_0: { value: 0 },
                    // prefixed state for an UNRELATED resource -> survives.
                    vals_storage_water_cap_0: { value: 50 },
                    // a plain value (no prefix, not storage-owned) -> survives.
                    cycle: { value: 0, max: 10 },
                },
                display: {
                    label: "x",
                    display_key: "k",
                    bars: [
                        { key: "state.food" },
                        { key: "state.food.value" },
                        { key: "state.food.max" },
                        { key: "state.heat" },
                        { key: "state.water" },
                    ],
                },
                passiveEffects: [
                    // target ref prefix (food) -> removed (L84-88).
                    {
                        op: Op.ADD,
                        target: "self.state.vals_entropy_food_0",
                        value: 1,
                    },
                    // source ref prefix (food) -> removed (L93-97).
                    {
                        op: Op.ADD,
                        target: "self.state.something",
                        source: "self.state.auto_req_food_need_0",
                        value: 1,
                    },
                    // target is self.state.food.max -> removed (L101-102).
                    { op: Op.SET, target: "self.state.food.max", value: 100 },
                    // SUB entropy-tick drain on food -> removed (L103-109).
                    {
                        op: Op.SUB,
                        target: "self.state.food.value",
                        source: "self.state.vals_entropy_tick_food_0",
                        value: 1,
                    },
                    // unrelated effect -> survives.
                    { op: Op.ADD, target: "self.state.water.value", value: 1 },
                ],
                behavior: {
                    rules: [
                        {
                            id: "sys_auto_req_food_need_0",
                            sortKey: "a",
                            conditions: [],
                            actions: [],
                        },
                        {
                            id: "sys_auto_req_food_xfer_0",
                            sortKey: "b",
                            conditions: [],
                            actions: [],
                        },
                        {
                            id: "sys_auto_req_food_xfer_cap_0",
                            sortKey: "c",
                            conditions: [],
                            actions: [],
                        },
                        // unrelated rule -> survives.
                        {
                            id: "sys_keep_me",
                            sortKey: "d",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.state).toEqual({
            vals_storage_water_cap_0: { value: 50 },
            cycle: { value: 0, max: 10 },
        });
        // Only the food tag (and the storage-owned `heat` tag) are stripped;
        // `storage:heat` goes because `heat` is a storage-owned state entry.
        expect(draft.tags).toEqual(["decor"]);
        expect(draft.components.display?.bars).toEqual([
            { key: "state.water" },
        ]);
        expect(draft.components.passiveEffects).toEqual([
            { op: "ADD", target: "self.state.water.value", value: 1 },
        ]);
        expect(draft.components.behavior?.rules).toEqual([
            { id: "sys_keep_me", sortKey: "d", conditions: [], actions: [] },
        ]);
    });

    it("skips a resource entirely when it is a cycle-cost resource (state marker)", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {
                state: {
                    food: { ...storageEntry },
                    vals_storage_food_cap_0: { value: 100 },
                    // presence of this marker makes `food` a cycle-cost resource.
                    vals_cycle_cost_total_food: { value: 0 },
                },
                display: { label: "x", display_key: "k", bars: [{ key: "state.food" }] },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        // Nothing removed: the early `return` on L61 short-circuits cleanup.
        expect(draft.components.state).toEqual({
            food: { ...storageEntry },
            vals_storage_food_cap_0: { value: 100 },
            vals_cycle_cost_total_food: { value: 0 },
        });
        expect(draft.tags).toEqual(["storage:food"]);
        expect(draft.components.display?.bars).toEqual([{ key: "state.food" }]);
    });

    it("skips a resource when a sys_cycle_cost_consume rule marks it (behavior marker)", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {
                state: {
                    vals_storage_food_cap_0: { value: 100 },
                },
                behavior: {
                    rules: [
                        {
                            id: "sys_cycle_cost_consume_food",
                            sortKey: "z",
                            conditions: [],
                            actions: [],
                        },
                        {
                            id: "sys_auto_req_food_need_0",
                            sortKey: "a",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        // The behavior-rule marker also triggers the early return -> nothing removed.
        expect(draft.components.state).toEqual({
            vals_storage_food_cap_0: { value: 100 },
        });
        expect(draft.tags).toEqual(["storage:food"]);
        expect(draft.components.behavior?.rules).toEqual([
            { id: "sys_cycle_cost_consume_food", sortKey: "z", conditions: [], actions: [] },
            { id: "sys_auto_req_food_need_0", sortKey: "a", conditions: [], actions: [] },
        ]);
    });

    it("does NOT treat a resource as cycle-cost when only a DIFFERENT resource is marked", () => {
        // Marker exists for `ore`, but the config resource is `food` -> food is
        // cleaned normally; the ore marker is untouched (kills the interpolation
        // of the resource into the marker key on L21/L25).
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {
                state: {
                    vals_storage_food_cap_0: { value: 100 },
                    vals_cycle_cost_total_ore: { value: 0 },
                },
                behavior: {
                    rules: [
                        {
                            id: "sys_cycle_cost_consume_ore",
                            sortKey: "z",
                            conditions: [],
                            actions: [],
                        },
                    ],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        // food's prefixed state IS removed; ore markers untouched.
        expect(draft.components.state).toEqual({
            vals_cycle_cost_total_ore: { value: 0 },
        });
        expect(draft.tags).toEqual([]);
        expect(draft.components.behavior?.rules).toEqual([
            { id: "sys_cycle_cost_consume_ore", sortKey: "z", conditions: [], actions: [] },
        ]);
    });

    it("trims whitespace from config resources and drops blank ones", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {
                state: {
                    vals_storage_food_cap_0: { value: 100 },
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [
            // leading/trailing space must be trimmed so "  food  " targets "food".
            makeStorage({ resource: "  food  " }),
            // a blank resource is filtered out and must NOT clean anything.
            makeStorage({ resource: "   " }),
        ]);

        expect(draft.components.state).toEqual({});
        expect(draft.tags).toEqual([]);
    });

    it("only deletes a key equal to the resource when that entry is storage-owned", () => {
        // Two entries literally named like resources: one storage-owned, one not.
        const draft = createBlueprint("store", {
            components: {
                state: {
                    // storage-owned (has allowWithdraw) -> removed via L65.
                    food: { value: 5, allowWithdraw: false },
                    // NOT storage-owned (plain value) and not prefixed -> survives,
                    // even though it is named after a config resource.
                    water: { value: 9, max: 20 },
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [
            makeStorage({ resource: "food" }),
            makeStorage({ resource: "water" }),
        ]);

        expect(draft.components.state).toEqual({ water: { value: 9, max: 20 } });
    });

    it("picks up storage-owned state entries via priority and allowDeposit keys", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:byPriority", "storage:byDeposit"],
            components: {
                state: {
                    // storage-owned solely via `priority` key.
                    byPriority: { value: 1, priority: 5 },
                    // storage-owned solely via `allowDeposit` key.
                    byDeposit: { value: 2, allowDeposit: false },
                },
            },
        }) as Blueprint;

        // No configs at all: these are discovered purely from state (L56-58).
        reconcileStorageCompilerArtifacts(draft, []);

        expect(draft.components.state).toEqual({});
        expect(draft.tags).toEqual([]);
    });

    it("does not treat arrays or non-object state entries as storage-owned", () => {
        const draft = createBlueprint("store", {
            tags: [],
            components: {
                state: {
                    // an array that *has* index 0 etc but no allow*/priority -> not owned.
                    listish: [1, 2, 3] as never,
                    // a primitive number -> not an object -> not owned.
                    numberish: 7 as never,
                    // null -> falsy -> not owned.
                    nullish: null as never,
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, []);

        // None are storage-owned, no configs -> everything survives untouched.
        expect(draft.components.state).toEqual({
            listish: [1, 2, 3],
            numberish: 7,
            nullish: null,
        });
    });

    it("ignores bars whose key is non-string or does not match the bar-resource regex", () => {
        const draft = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                display: {
                    label: "x",
                    display_key: "k",
                    bars: [
                        // matches state.food -> removed.
                        { key: "state.food" },
                        // non-string key -> readBarResource returns null -> kept.
                        { key: 123 as never },
                        // does not match the anchored/grouped regex -> kept.
                        { key: "state.food.other" },
                        { key: "prefix.state.food" },
                        // matches a different resource -> kept.
                        { key: "state.water" },
                    ],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.display?.bars).toEqual([
            { key: 123 },
            { key: "state.food.other" },
            { key: "prefix.state.food" },
            { key: "state.water" },
        ]);
    });

    it("keeps SUB-on-food.value effects whose source is NOT the food entropy-tick prefix", () => {
        const draft = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                passiveEffects: [
                    // SUB on food.value but source is a DIFFERENT resource's tick
                    // prefix (water). It survives the source-prefix clause (water !=
                    // food refs) and reaches the final triple, whose food-specific
                    // tick check (L106-108) is false -> KEPT. This exercises L104,
                    // L105 (true), L106 (typeof string), L107-108 (startsWith false).
                    {
                        op: Op.SUB,
                        target: "self.state.food.value",
                        source: "self.state.vals_entropy_tick_water_0",
                        value: 1,
                    },
                    // SUB on food.value with a hand-authored, non-prefixed source.
                    // Reaches the final clause; L107 startsWith(food tick) is false
                    // -> KEPT. Drives the L104=SUB / L105=food.value path with a
                    // negative L107 result.
                    {
                        op: Op.SUB,
                        target: "self.state.food.value",
                        source: "self.state.manual_drain.value",
                        value: 1,
                    },
                    // op is ADD (not SUB), target food.value, source a non-prefixed
                    // string. The final clause's L104 (op===SUB) is FALSE -> KEPT.
                    // Flipping L104 to a tautology would wrongly remove this.
                    {
                        op: Op.ADD,
                        target: "self.state.food.value",
                        source: "self.state.manual_drain.value",
                        value: 1,
                    },
                ],
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        // All three survive: none matches a food removal clause.
        expect(draft.components.passiveEffects).toEqual([
            {
                op: "SUB",
                target: "self.state.food.value",
                source: "self.state.vals_entropy_tick_water_0",
                value: 1,
            },
            {
                op: "SUB",
                target: "self.state.food.value",
                source: "self.state.manual_drain.value",
                value: 1,
            },
            {
                op: "ADD",
                target: "self.state.food.value",
                source: "self.state.manual_drain.value",
                value: 1,
            },
        ]);
    });

    it("removes an entropy-tick SUB drain (via the source-prefix clause) and keeps a sibling-source SUB", () => {
        // The food entropy-tick source matches the refs source-prefix list, so the
        // effect is removed by the source-prefix clause (the earlier of the two
        // matching clauses). Asserting removal pins that path.
        const removed = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                passiveEffects: [
                    {
                        op: Op.SUB,
                        target: "self.state.food.value",
                        source: "self.state.vals_entropy_tick_food_0",
                        value: 1,
                    },
                ],
            },
        }) as Blueprint;
        reconcileStorageCompilerArtifacts(removed, [makeStorage({ resource: "food" })]);
        expect(removed.components.passiveEffects).toEqual([]);

        // Same source but op ADD and target a sibling: still removed, because the
        // source-prefix clause ignores op/target entirely (food source = remove).
        const addSibling = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                passiveEffects: [
                    {
                        op: Op.ADD,
                        target: "self.state.water.value",
                        source: "self.state.vals_entropy_tick_food_0",
                        value: 1,
                    },
                ],
            },
        }) as Blueprint;
        reconcileStorageCompilerArtifacts(addSibling, [
            makeStorage({ resource: "food" }),
        ]);
        expect(addSibling.components.passiveEffects).toEqual([]);
    });

    it("removes passive effects targeting self.state.<resource>.max exactly", () => {
        const draft = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                passiveEffects: [
                    // exact .max target -> removed.
                    { op: Op.SET, target: "self.state.food.max", value: 100 },
                    // .value target (not .max) and nothing else matches -> kept.
                    { op: Op.SET, target: "self.state.food.value", value: 100 },
                    // sibling .max -> kept.
                    { op: Op.SET, target: "self.state.water.max", value: 100 },
                ],
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.passiveEffects).toEqual([
            { op: "SET", target: "self.state.food.value", value: 100 },
            { op: "SET", target: "self.state.water.max", value: 100 },
        ]);
    });

    it("filters behavior rules by all three sys_auto_req prefixes and tolerates rules without an id", () => {
        const draft = createBlueprint("store", {
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                behavior: {
                    rules: [
                        { id: "sys_auto_req_food_need_0", sortKey: "a", conditions: [], actions: [] },
                        { id: "sys_auto_req_food_xfer_0", sortKey: "b", conditions: [], actions: [] },
                        { id: "sys_auto_req_food_xfer_cap_0", sortKey: "c", conditions: [], actions: [] },
                        // id present but for a different resource -> kept.
                        { id: "sys_auto_req_water_need_0", sortKey: "d", conditions: [], actions: [] },
                        // rule with an undefined id -> optional chaining keeps it.
                        { sortKey: "e", conditions: [], actions: [] } as never,
                    ],
                },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.behavior?.rules).toEqual([
            { id: "sys_auto_req_water_need_0", sortKey: "d", conditions: [], actions: [] },
            { sortKey: "e", conditions: [], actions: [] },
        ]);
    });

    it("handles a draft with no display, passiveEffects, or behavior components (optional chaining safety)", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {
                state: {
                    food: { ...storageEntry },
                    vals_storage_food_cap_0: { value: 1 },
                },
            },
        }) as Blueprint;
        // strip the display the factory injects so display is genuinely absent.
        delete (draft.components as Record<string, unknown>).display;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.state).toEqual({});
        expect(draft.tags).toEqual([]);
        expect(draft.components.display).toBeUndefined();
        expect(draft.components.passiveEffects).toBeUndefined();
        expect(draft.components.behavior).toBeUndefined();
    });

    it("leaves bars and passiveEffects untouched when they are not arrays (Array.isArray guards)", () => {
        const draft = createBlueprint("store", {
            tags: [],
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                // non-array values for the two Array.isArray-guarded branches
                // (L75 display.bars, L80 passiveEffects). These are never iterated
                // because the guards return early.
                display: { label: "x", display_key: "k", bars: "nope" as never },
                passiveEffects: "nope" as never,
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        // state still cleaned; the non-array fields are passed over untouched.
        expect(draft.components.state).toEqual({});
        expect(draft.components.display?.bars).toBe("nope");
        expect(draft.components.passiveEffects).toBe("nope" as never);
    });

    it("leaves behavior.rules untouched when it is an empty array (Array.isArray guard, L114)", () => {
        const draft = createBlueprint("store", {
            tags: [],
            components: {
                state: { vals_storage_food_cap_0: { value: 1 } },
                behavior: { rules: [] },
            },
        }) as Blueprint;

        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.state).toEqual({});
        expect(draft.components.behavior?.rules).toEqual([]);
    });

    it("does nothing when state is entirely absent", () => {
        const draft = createBlueprint("store", {
            tags: ["storage:food"],
            components: {},
        }) as Blueprint;
        delete (draft.components as Record<string, unknown>).display;

        // No state at all: Object.entries(undefined ?? {}) is empty, and the
        // config resource cleanup runs against an undefined state safely.
        reconcileStorageCompilerArtifacts(draft, [makeStorage({ resource: "food" })]);

        expect(draft.components.state).toBeUndefined();
        // the tag IS still removed because the resource came from a config.
        expect(draft.tags).toEqual([]);
    });
});
