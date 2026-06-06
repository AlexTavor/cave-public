import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { samplerCompiler } from "./samplerCompiler";
import type { SamplerAbilityConfig } from "../../../data/schemas/abilities/sampler";
import { createBlueprint } from "../../test/factories";

/**
 * P2b — Sampler round-trip · Hardening II PBT pilot (money metric, round-trip shape).
 *
 * INVARIANT (round-trip / structure): the compiled sampler mirrors `source` into ONE
 * derived local state key — value←source always; max←(source with the *trailing*
 * `.value` rewritten to `.max`) IFF source ends in `.value` — and the injected state
 * defaults visible/max per config.
 *
 * PROVENANCE (design-sourced; not read off the impl):
 *  - [contract] docs/phase-13/tv2_p_7_lld.md §2.2 "Sampler Ability":
 *      • State Injection: state.[target] = { value: 0, visible: config.visible, max: config.max }.
 *      • Action 1 (Sync Value): MUTATE self.state.[target].value, op SET, value = config.source.
 *      • Action 2 (Sync Max, inferential): IFF source ends ".value", MUTATE
 *        self.state.[target].max, op SET, value = <source: trailing .value → .max>.
 *    NB the LLD writes the max rewrite informally as `source.replace('.value','.max')`
 *    (first-occurrence); the round-trip INTENT is to mirror the *trailing* `.value`. We
 *    assert the trailing semantics and flag the loose wording as a spec-clarification
 *    (triage) — NOT a relaxation.
 *
 * MONEY-METRIC TARGET: the trailing anchor in the `.value`→`.max` mirror. A single
 * example (source="heat.value") cannot distinguish /\.value$/ from /\.value/; only a
 * generator that also places ".value" mid-path (e.g. "a.value.b.value") does. The
 * example suite missed exactly this — seeds pinned → 0 flakiness.
 */

const PINNED = { seed: 0x5a3741, numRuns: 400 } as const;
const VALUE_SUFFIX = ".value";

const segment = fc.constantFrom(
    "heat",
    "food",
    "wood",
    "notoriety",
    "global",
    "sys_world",
    "state",
    "power",
    "mind",
    "social",
    "a",
    "b",
);
const dottedPath = fc
    .array(segment, { minLength: 1, maxLength: 4 })
    .map((parts) => parts.join("."));

const sourceArb = fc.oneof(
    dottedPath, // no .value/.max suffix → no max mirror
    dottedPath.map((path) => `${path}${VALUE_SUFFIX}`), // trailing .value → triggers mirror
    dottedPath.map((path) => `${path}.max`), // trailing .max → no mirror
    // adversarial: ".value" mid-path AND trailing — only this distinguishes the anchor.
    fc
        .tuple(dottedPath, dottedPath)
        .map(([a, b]) => `${a}${VALUE_SUFFIX}.${b}${VALUE_SUFFIX}`),
);

const configArb: fc.Arbitrary<SamplerAbilityConfig> = fc.record(
    {
        source: sourceArb,
        visible: fc.boolean(),
        max: fc.double({ noNaN: true }),
    },
    { requiredKeys: ["source"] }, // visible/max sometimes absent → exercise the defaults
);

// Trailing `.value` → `.max` (the round-trip intent), computed independently of the impl.
const expectedMaxSource = (source: string): string =>
    `${source.slice(0, source.length - VALUE_SUFFIX.length)}.max`;

describe("samplerCompiler — round-trip mirror (property)", () => {
    it("P2b: mirrors source into one derived state key (value always, max iff trailing .value)", () => {
        fc.assert(
            fc.property(
                configArb,
                fc.integer({ min: 0, max: 9 }),
                (config, index) => {
                    const draft = createBlueprint("sampler-bp", {
                        components: { state: { cycle: { value: 0, max: 100 } } },
                    });

                    samplerCompiler(draft, config, index);

                    // Exactly one new state key was injected (the derived target).
                    const state = draft.components.state ?? {};
                    const newKeys = Object.keys(state).filter((k) => k !== "cycle");
                    expect(newKeys).toHaveLength(1);
                    const key = newKeys[0];

                    // State Injection contract (defaulting invariant).
                    expect(state[key]).toEqual({
                        value: 0,
                        visible: config.visible ?? true,
                        max: config.max ?? 100,
                    });

                    const rules = draft.components.behavior?.rules ?? [];
                    expect(rules).toHaveLength(1);
                    const actions = rules[0].actions ?? [];

                    const source = config.source.trim();
                    const hasMax = source.endsWith(VALUE_SUFFIX);

                    // Sync Value contract: writes `${key}.value`, reads `source`.
                    expect(actions[0]).toEqual({
                        type: "MUTATE",
                        target: `self.state.${key}.value`,
                        op: "SET",
                        value: source,
                    });

                    // Sync Max contract: present iff trailing .value; trailing-mirror value.
                    expect(actions).toHaveLength(hasMax ? 2 : 1);
                    if (hasMax) {
                        expect(actions[1]).toEqual({
                            type: "MUTATE",
                            target: `self.state.${key}.max`,
                            op: "SET",
                            value: expectedMaxSource(source),
                        });
                    }
                },
            ),
            PINNED,
        );
    });
});
