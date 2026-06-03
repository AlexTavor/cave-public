import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import { compileStorageEntropy } from "./storageEntropyCompiler";
import { Op } from "../../../data/schemas/primitives";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import type { Effect } from "../../../data/schemas/primitives";

const makeConfig = (
    overrides: Partial<StorageAbilityConfig> = {},
): StorageAbilityConfig => ({
    resource: "heat",
    initialValue: 0,
    capacity: { base: 100, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0.2, perBody: 0, multPerBody: 0 },
    visible: true,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
    ...overrides,
});

// The 3 tick effects appended after the scalable-value SET, for a given
// resource/index. Used to assert the tail of passiveEffects exactly.
const tickEffects = (resource: string, index: number): Effect[] => {
    const tick = `self.state.vals_entropy_tick_${resource}_${index}.value`;
    const value = `self.state.vals_entropy_${resource}_${index}.value`;
    return [
        { op: Op.SET, target: tick, source: "global.dt_s" },
        { op: Op.MULT, target: tick, source: value },
        { op: Op.SUB, target: `self.state.${resource}.value`, source: tick },
    ];
};

describe("compileStorageEntropy", () => {
    it("produces the full passiveEffects + state output for zero-scaling entropy", () => {
        const draft = createBlueprint("bp_heat", { components: {} });

        compileStorageEntropy(draft, makeConfig(), "heat", 2);

        // State entries created by ensureStateEntry, with the initial entropy
        // base written into the value key by compileScalableValue (zero-scale).
        expect(draft.components.state).toEqual({
            vals_entropy_heat_2: { value: 0.2, visible: false },
            vals_entropy_tick_heat_2: { value: 0, visible: false },
        });

        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_entropy_heat_2.value",
                value: 0.2,
            },
            ...tickEffects("heat", 2),
        ]);
    });

    it("threads resource and index into every emitted key (different resource/index)", () => {
        const draft = createBlueprint("bp_water", { components: {} });

        compileStorageEntropy(
            draft,
            makeConfig({
                resource: "water",
                entropy: { base: 1, perBody: 0, multPerBody: 0 },
            }),
            "water",
            5,
        );

        expect(draft.components.state).toEqual({
            vals_entropy_water_5: { value: 1, visible: false },
            vals_entropy_tick_water_5: { value: 0, visible: false },
        });
        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_entropy_water_5.value",
                value: 1,
            },
            ...tickEffects("water", 5),
        ]);
    });

    it("initializes draft.components when the draft has none", () => {
        // Force components to be absent to cover `draft.components ??= {}`.
        const draft = createBlueprint("bp_bare", { components: {} });
        (draft as { components?: unknown }).components = undefined;

        compileStorageEntropy(draft, makeConfig(), "heat", 0);

        expect(draft.components.passiveEffects).toEqual([
            {
                op: Op.SET,
                target: "self.state.vals_entropy_heat_0.value",
                value: 0.2,
            },
            ...tickEffects("heat", 0),
        ]);
    });

    describe("idempotency filter on existing passiveEffects", () => {
        it("removes a prior entropy-value SET effect (target === entropyValueTarget)", () => {
            const draft = createBlueprint("bp_redo", { components: {} });
            const stale = {
                op: Op.SET,
                target: "self.state.vals_entropy_heat_2.value",
                value: 999,
            };
            const unrelated = {
                op: Op.ADD,
                target: "self.state.other.value",
                source: "global.dt_s",
            };
            draft.components.passiveEffects = [stale, unrelated];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            const effects = draft.components.passiveEffects ?? [];
            // The stale entropy-value SET (value 999) must be gone; the freshly
            // compiled one (value 0.2) replaces it.
            expect(effects).not.toContainEqual(stale);
            // Unrelated effect is preserved (filter returns true for it).
            expect(effects).toContainEqual(unrelated);
            expect(effects).toEqual([
                unrelated,
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });

        it("removes a prior entropy-tick effect (target === entropyTickTarget)", () => {
            const draft = createBlueprint("bp_redo", { components: {} });
            const staleTick = {
                op: Op.SET,
                target: "self.state.vals_entropy_tick_heat_2.value",
                source: "global.dt_s",
            };
            draft.components.passiveEffects = [staleTick];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            const effects = draft.components.passiveEffects ?? [];
            // Exactly one tick-SET should remain (the re-emitted one), not two.
            const tickSets = effects.filter(
                (e) =>
                    e.target ===
                        "self.state.vals_entropy_tick_heat_2.value" &&
                    e.op === Op.SET,
            );
            expect(tickSets).toHaveLength(1);
            expect(effects).toEqual([
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });

        it("removes the prior resource-drain SUB effect (op SUB + resource target + tick source)", () => {
            const draft = createBlueprint("bp_redo", { components: {} });
            const staleDrain = {
                op: Op.SUB,
                target: "self.state.heat.value",
                source: "self.state.vals_entropy_tick_heat_2.value",
            };
            draft.components.passiveEffects = [staleDrain];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            const effects = draft.components.passiveEffects ?? [];
            const drains = effects.filter(
                (e) =>
                    e.op === Op.SUB &&
                    e.target === "self.state.heat.value" &&
                    e.source ===
                        "self.state.vals_entropy_tick_heat_2.value",
            );
            // Re-emitted exactly once (old one filtered out, new one pushed).
            expect(drains).toHaveLength(1);
            expect(effects).toEqual([
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });

        it("keeps a SUB effect that targets the resource but has a DIFFERENT source", () => {
            const draft = createBlueprint("bp_keep", { components: {} });
            // op SUB, correct resource target, but source is NOT the tick target,
            // so the third filter clause (effect.source === entropyTickTarget)
            // is false and the effect must survive.
            const otherDrain = {
                op: Op.SUB,
                target: "self.state.heat.value",
                source: "self.state.something_else.value",
            };
            draft.components.passiveEffects = [otherDrain];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            expect(draft.components.passiveEffects).toContainEqual(otherDrain);
            expect(draft.components.passiveEffects).toEqual([
                otherDrain,
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });

        it("keeps a non-SUB effect that targets the resource with the tick source", () => {
            const draft = createBlueprint("bp_keep", { components: {} });
            // Correct target + source but op is ADD, not SUB, so the first
            // clause (effect.op === Op.SUB) is false and the effect survives.
            const addDrain = {
                op: Op.ADD,
                target: "self.state.heat.value",
                source: "self.state.vals_entropy_tick_heat_2.value",
            };
            draft.components.passiveEffects = [addDrain];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            expect(draft.components.passiveEffects).toContainEqual(addDrain);
            expect(draft.components.passiveEffects).toEqual([
                addDrain,
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });

        it("keeps an entropy-value/tick effect for a DIFFERENT index (no over-removal)", () => {
            const draft = createBlueprint("bp_keep", { components: {} });
            // Same resource, different index → targets do not match this call's
            // entropyValueTarget/entropyTickTarget, so they must be preserved.
            const otherIndexValue = {
                op: Op.SET,
                target: "self.state.vals_entropy_heat_9.value",
                value: 7,
            };
            const otherIndexTick = {
                op: Op.SET,
                target: "self.state.vals_entropy_tick_heat_9.value",
                source: "global.dt_s",
            };
            draft.components.passiveEffects = [otherIndexValue, otherIndexTick];

            compileStorageEntropy(draft, makeConfig(), "heat", 2);

            const effects = draft.components.passiveEffects ?? [];
            expect(effects).toContainEqual(otherIndexValue);
            expect(effects).toContainEqual(otherIndexTick);
            expect(effects).toEqual([
                otherIndexValue,
                otherIndexTick,
                {
                    op: Op.SET,
                    target: "self.state.vals_entropy_heat_2.value",
                    value: 0.2,
                },
                ...tickEffects("heat", 2),
            ]);
        });
    });
});
