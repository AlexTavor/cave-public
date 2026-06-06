import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
    CAVE_STATUS_ABOUTS,
    FactScopeSchema,
    FactTypeSchema,
    StructuredConditionOperatorSchema,
    UserInteractionStateSchema,
} from "../../../data/schemas/conditionPrimitives";
import type { StructuredConditionInput } from "../../../data/schemas/conditions";
import {
    compileStructuredConditionAllGate,
    compileStructuredConditionNotAllGate,
    compileStructuredConditions,
} from "./compileStructuredConditions";

/**
 * P1 — Compiler reproducibility · Hardening II PBT pilot (the on-ramp).
 *
 * INVARIANT (determinism): compiling the same structured conditions twice — and
 * compiling them under ANY input id/sortKey — yields deep-equal LogicRules.
 *
 * PROVENANCE (design-sourced; never read off the implementation):
 *  - [decision] constraints/state/determinism.md — compile-time ids (nanoid/ulid)
 *    "made compiled output non-reproducible, breaking the compiler contract"; the
 *    fix derives keys from kind+index because "the ids were never load-bearing
 *    (... nothing sorts or keys on id/sortKey)".
 *  - [contract] docs/phase-18/visibility_cleanup_lld.md §3.3 "Deterministic compile
 *    contract": recompiling a blueprint "must yield ... the current authored config only".
 *  - [oracle] compileStructuredConditions.test.ts:159 — the single-example deep-equal
 *    ("same input compiles to byte-identical rules") that this property generalizes
 *    over the whole input domain.
 *
 * GENERATOR FEEDSTOCK: schema-derived — every kind, field and enum value comes from
 * src/data/schemas/conditions.ts (StructuredConditionSchema), not from the compiler.
 *
 * SCORING: on-ramp + regression-lock, NOT the money metric. A determinism property
 * locks determinism, not structure, so it is expected to kill 0 of this module's
 * (structure-shaped) survivors. Its value is proving the harness end-to-end and
 * catching any future reintroduction of non-determinism. Seeds pinned → 0 flakiness.
 */

// Pinned so a counterexample is a frozen, reproducible regression example (work
// order §10: unseeded PBT flakes in CI and gets deleted).
const PINNED = { seed: 0x5ca1ab1e, numRuns: 500 } as const;

const operatorArb = fc.constantFrom(...StructuredConditionOperatorSchema.options);
const valueArb = fc.double({ noNaN: true });
const caveStatusAbouts = [...CAVE_STATUS_ABOUTS];
const nonCaveFactTypes = FactTypeSchema.options.filter(
    (factType) => factType !== "cave_status",
);

const factThresholdArb = fc.oneof(
    // cave_status: the schema's superRefine constrains factAbout to food|heat.
    fc.record({
        kind: fc.constant("fact_threshold" as const),
        scope: fc.constantFrom(...FactScopeSchema.options),
        factType: fc.constant("cave_status" as const),
        factAbout: fc.constantFrom(...caveStatusAbouts),
        operator: operatorArb,
        value: valueArb,
    }),
    fc.record({
        kind: fc.constant("fact_threshold" as const),
        scope: fc.constantFrom(...FactScopeSchema.options),
        factType: fc.constantFrom(...nonCaveFactTypes),
        // "self" exercises the throttle_level/self special-case ref path (L7-11).
        factAbout: fc.oneof(
            fc.constantFrom("self", "world"),
            fc.string({ minLength: 1 }),
        ),
        operator: operatorArb,
        value: valueArb,
    }),
);

const conditionArb: fc.Arbitrary<StructuredConditionInput> = fc.oneof(
    factThresholdArb,
    fc.record({
        kind: fc.constant("world_state_threshold" as const),
        key: fc.string({ minLength: 1 }),
        operator: operatorArb,
        value: valueArb,
    }),
    fc.record({
        kind: fc.constant("entity_tag_present" as const),
        tag: fc.string({ minLength: 1 }),
    }),
    fc.record({
        kind: fc.constant("world_state_boolean" as const),
        key: fc.string({ minLength: 1 }),
        value: fc.boolean(),
    }),
    fc.record({
        kind: fc.constant("user_interaction" as const),
        interaction: fc.constantFrom(...UserInteractionStateSchema.options),
    }),
    // Leaf kinds: the compiler reads only `kind` (constant compiled expression).
    fc.constant({ kind: "bodies_assigned" } as const),
    fc.constant({ kind: "body_in_pointer" } as const),
    fc.constant({ kind: "carriers_orbiting" } as const),
    fc.constant({ kind: "destructive_assignment_has_all_bodies" } as const),
);

const conditionsArb = fc.array(conditionArb, { maxLength: 8 });
const idArb = fc.string();

describe("compileStructuredConditions — reproducibility (property)", () => {
    it("P1a: same input compiles to deep-equal rules (all three entry points)", () => {
        fc.assert(
            fc.property(conditionsArb, (conditions) => {
                expect(compileStructuredConditions(conditions)).toEqual(
                    compileStructuredConditions(conditions),
                );
                expect(compileStructuredConditionAllGate(conditions)).toEqual(
                    compileStructuredConditionAllGate(conditions),
                );
                expect(
                    compileStructuredConditionNotAllGate(conditions),
                ).toEqual(compileStructuredConditionNotAllGate(conditions));
            }),
            PINNED,
        );
    });

    it("P1b: compiled output is invariant to input id/sortKey (the determinism fix's contract)", () => {
        fc.assert(
            fc.property(
                conditionsArb,
                idArb,
                idArb,
                idArb,
                idArb,
                (conditions, idA, sortKeyA, idB, sortKeyB) => {
                    const withA: StructuredConditionInput[] = conditions.map(
                        (condition) => ({
                            ...condition,
                            id: idA,
                            sortKey: sortKeyA,
                        }),
                    );
                    const withB: StructuredConditionInput[] = conditions.map(
                        (condition) => ({
                            ...condition,
                            id: idB,
                            sortKey: sortKeyB,
                        }),
                    );
                    expect(compileStructuredConditions(withA)).toEqual(
                        compileStructuredConditions(withB),
                    );
                },
            ),
            PINNED,
        );
    });
});
