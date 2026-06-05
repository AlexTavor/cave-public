import { describe, it, expect, vi } from "vitest";
import { storageCompiler } from "./storageCompiler";
import { createBlueprint } from "../../test/factories";
import { Op } from "../../../data/schemas/primitives";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { Blueprint } from "../../../data/schemas/blueprint";

const makeConfig = (
    overrides: Partial<StorageAbilityConfig> = {},
): StorageAbilityConfig => ({
    resource: "food",
    initialValue: 0,
    capacity: { base: 100, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
    barColorHex: "#abcdef",
    ...overrides,
});

// A draft with a display that carries a radius (no valueRef yet), so the
// primary-radius wiring branch can fire.
const makeDraft = (id = "bp_store"): Blueprint =>
    createBlueprint(id, {
        components: {
            display: {
                label: id,
                display_key: "unknown",
                radius: { min: 10, max: 20 },
            },
        },
    });

describe("storageCompiler", () => {
    it("compiles a full primary storage entry end-to-end", () => {
        const draft = makeDraft("bp_full");

        storageCompiler(draft, makeConfig(), 0, true);

        expect(draft).toEqual({
            id: "bp_full",
            label: "bp_full",
            tags: ["storage:food"],
            components: {
                display: {
                    label: "bp_full",
                    display_key: "unknown",
                    radius: {
                        min: 10,
                        max: 20,
                        valueRef: "self.state.food.value",
                        maxRef: "self.state.food.max",
                    },
                    bars: [
                        {
                            key: "state.food",
                            maxKey: "state.food.max",
                            color: "#abcdef",
                            label: "food",
                            paletteColorKey: undefined,
                            position: undefined,
                        },
                    ],
                },
                state: {
                    food: {
                        value: 0,
                        max: 100,
                        visible: true,
                        allowDeposit: true,
                        allowWithdraw: true,
                        priority: 0,
                    },
                },
                passiveEffects: [
                    {
                        op: Op.SET,
                        target: "self.state.food.max",
                        value: 100,
                    },
                ],
            },
        });
    });

    it("returns early and warns when resource is whitespace-only (no mutation)", () => {
        const draft = makeDraft("bp_noresource");
        const before = structuredClone(draft);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        // Whitespace-only resource trims to empty → falsy → early return.
        storageCompiler(draft, makeConfig({ resource: "   " }), 0, true);

        expect(draft).toEqual(before);
        // The warn message names the offending blueprint id.
        expect(warn).toHaveBeenCalledWith(
            "Storage ability missing resource on 'bp_noresource'.",
        );
        warn.mockRestore();
    });

    it("returns early (without throwing) when resource is undefined", () => {
        // The optional chain in config.resource?.trim() must short-circuit
        // rather than calling .trim() on undefined.
        const draft = makeDraft("bp_undef");
        const before = structuredClone(draft);
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(() =>
            storageCompiler(
                draft,
                makeConfig({ resource: undefined as unknown as string }),
                0,
                true,
            ),
        ).not.toThrow();

        expect(draft).toEqual(before);
        expect(warn).toHaveBeenCalledTimes(1);
        warn.mockRestore();
    });

    it("initializes draft.tags when absent before adding the storage tag", () => {
        // Force tags undefined so `draft.tags ??= []` actually assigns.
        const draft = makeDraft("bp_notags");
        (draft as { tags?: string[] }).tags = undefined;

        storageCompiler(draft, makeConfig({ allowWithdraw: true }), 0, true);

        expect(draft.tags).toEqual(["storage:food"]);
    });

    it("trims surrounding whitespace from the resource id", () => {
        const draft = makeDraft("bp_trim");

        storageCompiler(draft, makeConfig({ resource: "  wood  " }), 0, true);

        // The trimmed id "wood" is used for state keys, tags, refs, and bars.
        expect(draft.components.state).toEqual({
            wood: {
                value: 0,
                max: 100,
                visible: true,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 0,
            },
        });
        expect(draft.tags).toEqual(["storage:wood"]);
        expect(draft.components.display?.radius).toEqual({
            min: 10,
            max: 20,
            valueRef: "self.state.wood.value",
            maxRef: "self.state.wood.max",
        });
    });

    it("clamps initialValue into [0, capacity.base]", () => {
        const overDraft = makeDraft("bp_over");
        storageCompiler(
            overDraft,
            makeConfig({ initialValue: 500, capacity: { base: 100, perBody: 0, multPerBody: 0 } }),
            0,
            true,
        );
        expect((overDraft.components.state as Record<string, { value: number }>).food.value).toBe(100);

        const underDraft = makeDraft("bp_under");
        storageCompiler(
            underDraft,
            makeConfig({ initialValue: 0, capacity: { base: 0, perBody: 0, multPerBody: 0 } }),
            0,
            true,
        );
        expect((underDraft.components.state as Record<string, { value: number }>).food.value).toBe(0);

        const midDraft = makeDraft("bp_mid");
        storageCompiler(
            midDraft,
            makeConfig({ initialValue: 40, capacity: { base: 100, perBody: 0, multPerBody: 0 } }),
            0,
            true,
        );
        expect((midDraft.components.state as Record<string, { value: number }>).food.value).toBe(40);
    });

    it("sets visible=false only when config.visible === false (and emits no bar)", () => {
        const draft = makeDraft("bp_hidden");

        storageCompiler(draft, makeConfig({ visible: false }), 0, true);

        const state = draft.components.state as Record<
            string,
            { visible: boolean }
        >;
        expect(state.food.visible).toBe(false);
        // visible===false → the bar block is skipped entirely.
        expect(draft.components.display?.bars).toBeUndefined();
    });

    it("keeps visible=true for any non-false value", () => {
        const draft = makeDraft("bp_visible");

        storageCompiler(draft, makeConfig({ visible: true }), 0, true);

        const state = draft.components.state as Record<
            string,
            { visible: boolean }
        >;
        expect(state.food.visible).toBe(true);
        expect(draft.components.display?.bars).toHaveLength(1);
    });

    it("does NOT add the storage tag when allowWithdraw is false", () => {
        const draft = makeDraft("bp_deposit_only");

        storageCompiler(draft, makeConfig({ allowWithdraw: false }), 0, true);

        expect(draft.tags).toEqual([]);
    });

    it("does not duplicate the storage tag when it already exists", () => {
        const draft = makeDraft("bp_dup");
        draft.tags = ["storage:food"];

        storageCompiler(draft, makeConfig({ allowWithdraw: true }), 0, true);

        expect(draft.tags).toEqual(["storage:food"]);
    });

    it("preserves unrelated existing tags while adding the storage tag", () => {
        const draft = makeDraft("bp_tags");
        draft.tags = ["existing"];

        storageCompiler(draft, makeConfig({ allowWithdraw: true }), 0, true);

        expect(draft.tags).toEqual(["existing", "storage:food"]);
    });

    it("uses the authored displayName (trimmed) as the bar label", () => {
        const draft = makeDraft("bp_named");

        storageCompiler(
            draft,
            makeConfig({ displayName: "  Stored Food  " }),
            0,
            true,
        );

        expect(draft.components.display?.bars?.[0]?.label).toBe("Stored Food");
    });

    it("falls back to the resource id when displayName is blank/whitespace", () => {
        const draft = makeDraft("bp_blanklabel");

        storageCompiler(
            draft,
            makeConfig({ resource: "gold", displayName: "   " }),
            0,
            true,
        );

        expect(draft.components.display?.bars?.[0]?.label).toBe("gold");
    });

    it("stores allowDeposit / allowWithdraw / priority verbatim", () => {
        const draft = makeDraft("bp_flags");

        storageCompiler(
            draft,
            makeConfig({
                resource: "ore",
                allowDeposit: false,
                allowWithdraw: false,
                priority: 7,
            }),
            0,
            true,
        );

        expect(draft.components.state).toEqual({
            ore: {
                value: 0,
                max: 100,
                visible: true,
                allowDeposit: false,
                allowWithdraw: false,
                priority: 7,
            },
        });
    });

    it("does NOT wire radius refs when not primary (index !== 0)", () => {
        const draft = makeDraft("bp_secondary");

        storageCompiler(draft, makeConfig(), 1, false);

        // Radius left untouched: no valueRef/maxRef added.
        expect(draft.components.display?.radius).toEqual({ min: 10, max: 20 });
    });

    it("does NOT wire radius refs when display has no radius", () => {
        const draft = createBlueprint("bp_noradius", {
            components: {
                display: { label: "bp_noradius", display_key: "unknown" },
            },
        });

        storageCompiler(draft, makeConfig(), 0, true);

        expect(draft.components.display?.radius).toBeUndefined();
        // Bars still appended (display present, visible).
        expect(draft.components.display?.bars).toHaveLength(1);
    });

    it("does NOT overwrite an existing radius valueRef", () => {
        const draft = createBlueprint("bp_existingref", {
            components: {
                display: {
                    label: "bp_existingref",
                    display_key: "unknown",
                    radius: {
                        min: 10,
                        max: 20,
                        valueRef: "self.state.preexisting.value",
                    },
                },
            },
        });

        storageCompiler(draft, makeConfig(), 0, true);

        expect(draft.components.display?.radius).toEqual({
            min: 10,
            max: 20,
            valueRef: "self.state.preexisting.value",
        });
    });

    it("indexes the capacity temp var name by the storage index", () => {
        // perBody scaling forces compileScalableValue to allocate a temp var
        // named `vals_storage_<resource>_cap_<index>`; assert the index threads.
        const draft = makeDraft("bp_indexed");

        storageCompiler(
            draft,
            makeConfig({
                resource: "wood",
                capacity: { base: 10, perBody: 2, multPerBody: 0 },
            }),
            3,
            false,
        );

        expect(
            draft.components.state?.["vals_storage_wood_cap_3"],
        ).toEqual({ value: 0, visible: false });
    });

    it("returns (after auto-request/entropy) when the draft has no display", () => {
        const draft = createBlueprint("bp_nodisplay", { components: {} });
        (draft.components as { display?: unknown }).display = undefined;

        storageCompiler(draft, makeConfig(), 0, true);

        // No display → no radius wiring and no bars, but state is still written.
        expect(draft.components.display).toBeUndefined();
        expect(draft.components.state).toEqual({
            food: {
                value: 0,
                max: 100,
                visible: true,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 0,
            },
        });
    });

    it("delegates to the entropy compiler when entropy.base is non-zero", () => {
        const draft = makeDraft("bp_entropy");

        storageCompiler(
            draft,
            makeConfig({
                resource: "heat",
                entropy: { base: 0.5, perBody: 0, multPerBody: 0 },
            }),
            0,
            true,
        );

        // Entropy state keys appear only when compileStorageEntropy runs.
        expect(draft.components.state?.["vals_entropy_heat_0"]).toBeDefined();
        expect(draft.components.state?.["vals_entropy_tick_heat_0"]).toBeDefined();
    });

    it("delegates to the entropy compiler when entropy.perBody is non-zero", () => {
        const draft = makeDraft("bp_entropy_pb");

        storageCompiler(
            draft,
            makeConfig({
                resource: "heat",
                entropy: { base: 0, perBody: 0.1, multPerBody: 0 },
            }),
            0,
            true,
        );

        expect(draft.components.state?.["vals_entropy_heat_0"]).toBeDefined();
    });

    it("does NOT delegate to the entropy compiler when base and perBody are both zero", () => {
        const draft = makeDraft("bp_noentropy");

        storageCompiler(draft, makeConfig(), 0, true);

        expect(draft.components.state?.["vals_entropy_food_0"]).toBeUndefined();
        expect(
            draft.components.state?.["vals_entropy_tick_food_0"],
        ).toBeUndefined();
    });

    it("delegates to the auto-request compiler when autoRequest is present", () => {
        const draft = makeDraft("bp_auto");

        storageCompiler(
            draft,
            makeConfig({
                resource: "coin",
                autoRequest: {
                    enabled: true,
                    cadence_s: 1,
                    minRequest: 1,
                    maxRequest: 100,
                },
            }),
            0,
            true,
        );

        expect(draft.components.state?.["auto_req_coin_timer_0"]).toBeDefined();
        expect(
            draft.components.behavior?.rules?.some(
                (r) => r.id === "sys_auto_req_coin_xfer_0",
            ),
        ).toBe(true);
    });

    it("does NOT delegate to the auto-request compiler when autoRequest is absent", () => {
        const draft = makeDraft("bp_noauto");

        storageCompiler(draft, makeConfig({ resource: "coin" }), 0, true);

        expect(draft.components.state?.["auto_req_coin_timer_0"]).toBeUndefined();
        expect(draft.components.behavior).toBeUndefined();
    });

    it("resets value/visible/flags and re-derives max on recompile of an existing entry", () => {
        // Pre-seed a state entry with stale value/max/visible; the ??= keeps the
        // object but the explicit assignments overwrite value/visible/flags, and
        // compileScalableValue re-writes max from capacity.base (100).
        const draft = makeDraft("bp_recompile");
        draft.components.state = {
            food: { value: 42, max: 250, visible: false },
        } as never;

        storageCompiler(draft, makeConfig({ initialValue: 30 }), 0, true);

        expect(draft.components.state).toEqual({
            food: {
                value: 30,
                max: 100,
                visible: true,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 0,
            },
        });
    });

    it("backfills max from capacity.base when an existing entry has no numeric max (scaling capacity)", () => {
        // Use a SCALING capacity so compileScalableValue does NOT write max via
        // setInitialValue — then the only thing that can set max is the L44
        // typeof guard. Existing entry has no `max`, so the guard fires.
        const draft = makeDraft("bp_nomax");
        draft.components.state = {
            food: { value: 0, visible: true },
        } as never;

        storageCompiler(
            draft,
            makeConfig({ capacity: { base: 100, perBody: 5, multPerBody: 0 } }),
            0,
            true,
        );

        expect(
            (draft.components.state as Record<string, { max: number }>).food
                .max,
        ).toBe(100);
    });

    it("does NOT overwrite an existing numeric max via the typeof guard (scaling capacity)", () => {
        // Existing entry already has a numeric max → the typeof guard is false,
        // so max must be preserved. Scaling capacity keeps compileScalableValue
        // from independently re-setting max.
        const draft = makeDraft("bp_keepmax");
        draft.components.state = {
            food: { value: 0, max: 250, visible: true },
        } as never;

        storageCompiler(
            draft,
            makeConfig({ capacity: { base: 100, perBody: 5, multPerBody: 0 } }),
            0,
            true,
        );

        expect(
            (draft.components.state as Record<string, { max: number }>).food
                .max,
        ).toBe(250);
    });

    it("creates a fresh entry with max=capacity.base when none exists", () => {
        // No pre-seeded entry → the ??= default sets max=capacity.base; assert
        // the default-object branch (L31) materializes correctly.
        const draft = makeDraft("bp_fresh");

        storageCompiler(
            draft,
            makeConfig({ capacity: { base: 100, perBody: 5, multPerBody: 0 } }),
            0,
            true,
        );

        expect(
            (draft.components.state as Record<string, { max: number; value: number; visible: boolean }>)
                .food,
        ).toMatchObject({ value: 0, max: 100, visible: true });
    });
});
