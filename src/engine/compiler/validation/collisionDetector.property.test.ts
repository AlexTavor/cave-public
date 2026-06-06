import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { collisionDetector } from "./collisionDetector";
import { deriveSamplerTargetKey } from "../abilities/samplerUtils";
import type { EditorConfig } from "../../../data/schemas/abilities";

/**
 * P3 — collisionDetector decision-totality · Hardening II PBT pilot (money metric, decision shape).
 *
 * INVARIANT (decision-totality): the validator flags EXACTLY the violations present — no
 * more, no less — over the input domain.
 *
 * PROVENANCE (design-sourced):
 *  - [contract] docs/phase-13/tv2_p_5_lld.md §2.2 "collisionDetector":
 *      • Duplicate Resource Checking (l.67-71): "If multiple entries target the same resource ID, flag as Error."
 *      • Orphaned Dependencies (l.77-79): "If Upkeep requires wood, but no Storage for wood exists, flag as Warning."
 *      • Target Validation (l.150): "Error if the derived [sampler] target key collides with reserved
 *        component keys ... or existing state keys defined elsewhere."
 *
 * Minimal `as EditorConfig` casts: the detector reads only `.resource` / `.source`, so these
 * are deliberate test fakes (full ability configs are irrelevant to the decision under test).
 *
 * Seeds pinned → 0 flakiness.
 */

const PINNED = { seed: 0xc0111de, numRuns: 400 } as const;

const resourcePool = fc.constantFrom("wood", "stone", "food", "heat", "iron", "gold");
const listOrUndef = fc.option(fc.array(resourcePool, { maxLength: 6 }), {
    nil: undefined,
});

const duplicateIdsOf = (
    resources: string[] | undefined,
    ability: string,
): string[] => {
    const counts = new Map<string, number>();
    for (const resource of resources ?? [])
        counts.set(resource, (counts.get(resource) ?? 0) + 1);
    return [...counts]
        .filter(([, count]) => count > 1)
        .map(([resource]) => `${ability}_duplicate_${resource}`);
};

describe("collisionDetector — decision-totality (property)", () => {
    it("P3a: flags exactly the duplicate-resource Errors and the upkeep-orphan Warnings present", () => {
        fc.assert(
            fc.property(
                listOrUndef,
                listOrUndef,
                listOrUndef,
                (storage, production, upkeep) => {
                    const abilities = {
                        storage: storage?.map((resource) => ({ resource })),
                        production: production?.map((resource) => ({ resource })),
                        upkeep: upkeep?.map((resource) => ({ resource })),
                    } as EditorConfig["abilities"];

                    const ids = collisionDetector({ abilities } as EditorConfig).map(
                        (issue) => issue.id,
                    );

                    // Duplicate decision-totality across the three resource families.
                    const expectedDuplicates = new Set([
                        ...duplicateIdsOf(storage, "storage"),
                        ...duplicateIdsOf(production, "production"),
                        ...duplicateIdsOf(upkeep, "upkeep"),
                    ]);
                    expect(
                        new Set(ids.filter((id) => id.includes("_duplicate_"))),
                    ).toEqual(expectedDuplicates);

                    // Orphan decision-totality: upkeep resources with no matching storage.
                    // (undefined upkeep ⇒ no orphans — kills the L64 `?? [...]` extraction sentinel.)
                    const storageSet = new Set(storage ?? []);
                    const expectedOrphans = new Set(
                        (upkeep ?? [])
                            .filter((resource) => !storageSet.has(resource))
                            .map((resource) => `upkeep_orphan_${resource}`),
                    );
                    expect(
                        new Set(
                            ids.filter((id) => id.startsWith("upkeep_orphan_")),
                        ),
                    ).toEqual(expectedOrphans);
                },
            ),
            PINNED,
        );
    });

    it("P3b: sampler targets — exactly the duplicates, and no spurious collisions for non-colliding targets", () => {
        const namePool = fc.constantFrom("wood", "food", "heat", "stone", "iron");
        const samplersArb = fc.array(
            namePool.map((name) => ({ source: `sys_world.state.${name}.value` })),
            { maxLength: 5 },
        );

        fc.assert(
            fc.property(samplersArb, (samplers) => {
                const abilities = { sampler: samplers } as EditorConfig["abilities"];
                // No stateKeys, default reserved keys → no legitimate collision should fire.
                const ids = collisionDetector({ abilities } as EditorConfig).map(
                    (issue) => issue.id,
                );

                const targets = samplers
                    .map((s) => deriveSamplerTargetKey(s.source) ?? "")
                    .filter(Boolean);
                const counts = new Map<string, number>();
                for (const target of targets)
                    counts.set(target, (counts.get(target) ?? 0) + 1);
                const expectedDuplicates = new Set(
                    [...counts]
                        .filter(([, count]) => count > 1)
                        .map(([target]) => `sampler_target_duplicate_${target}`),
                );
                expect(
                    new Set(
                        ids.filter((id) =>
                            id.startsWith("sampler_target_duplicate_"),
                        ),
                    ),
                ).toEqual(expectedDuplicates);

                // No false positives: derived `sampled_*` targets are never reserved and there
                // are no state keys ⇒ zero collisions. (Kills L124:9 condition→false.)
                expect(
                    ids.filter((id) => id.startsWith("sampler_target_collision_")),
                ).toEqual([]);
            }),
            PINNED,
        );
    });

    // P3c — KNOWN BUG, locked. ph13 §2.2 l.150 says a sampler target colliding with an existing
    // state key must Error, but `buildSamplerTargetIssues` removes all samplerTargets from
    // `nonSamplerState` before testing membership, so that branch is unreachable. This `it.fails`
    // documents the gap and will itself FAIL the day the impl is fixed — flip it to `it` then.
    // Routed to triage; not auto-fixed (PBT pilot guardrail).
    it.fails(
        "P3c (KNOWN BUG, ph13 §2.2 l.150 — TRIAGE): sampler target equal to an existing state key should Error",
        () => {
            const abilities = {
                sampler: [{ source: "sys_world.state.wood.value" }],
            } as EditorConfig["abilities"];
            const ids = collisionDetector({ abilities } as EditorConfig, {
                stateKeys: ["sampled_wood"], // pre-existing state key == the derived target
            }).map((issue) => issue.id);
            expect(ids).toContain("sampler_target_collision_sampled_wood");
        },
    );
});
