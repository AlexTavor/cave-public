import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import { reconcileStorageCompilerArtifacts } from "./storageCompilerReconciler";

/**
 * P2a — storageReconciler cleanup contract · Hardening II PBT pilot (BEHAVIOR-LOCK, not money metric).
 *
 * INVARIANT (idempotence + conservation/no-collateral): reconciling against the current
 * authored storage config (here: empty — every storage resource de-authored) removes ALL
 * storage-owned artifacts for those resources across every category, leaves unrelated
 * (non-storage) content untouched, and is idempotent.
 *
 * PROVENANCE (design-sourced):
 *  - [contract] docs/phase-18/visibility_cleanup_lld.md §3.3 (l.62): "Running compile
 *    repeatedly on the same blueprint ... must yield storage artifacts that reflect the
 *    current authored storage config only" — idempotence under recompile.
 *  - §5.3.2 (l.184): the reconciler "runs even when configs is empty ... so removing all
 *    storage abilities removes previously compiled storage artifacts" — no-op-to-empty.
 *  - §5.3.3 (l.186-231): the exact artifacts removed per cleanup resource R — state keys
 *    (with the listed prefixes), the `storage:${R}` tag, bars resolving to R, passive
 *    effects, and `sys_auto_req_${R}_*` behavior rules.
 *
 * SCORING: behavior-lock (PIN), NOT the money metric. Measured: scoped Stryker before==after
 * (17→17) — this property kills NONE of the module's survivors, because ~all of them are
 * unkillable redundant code (the cond4 passive-effect predicate is subsumed by the earlier
 * source-prefix check; the `state?.[key]` optional chaining is runtime-dead). That dead-code
 * finding is routed to triage, not auto-fixed. Seeds pinned → 0 flakiness.
 */

const PINNED = { seed: 0x570412e, numRuns: 300 } as const;

const resourceArb = fc.constantFrom("food", "heat", "wood", "stone");

// A draft carrying full storage artifacts (all 5 categories) for `resources`, plus
// unrelated "bystander" content that must survive reconciliation. Built as a test fake
// (`as unknown as Blueprint`): the reconciler reads only the fields set here.
const draftArb = fc
    .uniqueArray(resourceArb, { minLength: 1, maxLength: 3 })
    .map((resources) => {
        const state: Record<string, unknown> = { keep_state: { value: 5 } };
        const tags: string[] = ["keep-me"];
        const bars: Array<{ key: string }> = [{ key: "state.keepbar" }];
        const passiveEffects: Array<Record<string, unknown>> = [
            { op: "ADD", target: "self.state.keep.value", source: "global.dt_s" },
        ];
        const rules: Array<{ id: string }> = [{ id: "sys_keep_rule" }];

        for (const r of resources) {
            state[r] = { value: 10, allowDeposit: true }; // storage-owned (detection marker)
            state[`vals_entropy_${r}_0`] = { value: 1 };
            state[`auto_req_${r}_timer_0`] = { value: 0 };
            tags.push(`storage:${r}`);
            bars.push({ key: `state.${r}` });
            passiveEffects.push({
                op: "SET",
                target: `self.state.vals_entropy_${r}_0`,
                source: "x",
            });
            rules.push({ id: `sys_auto_req_${r}_need_0` });
        }

        const draft = {
            id: "store",
            label: "store",
            tags,
            components: {
                state,
                passiveEffects,
                behavior: { rules },
                display: { label: "store", display_key: "unknown", bars },
            },
        } as unknown as Blueprint;

        return { resources, draft };
    });

const storageOwned = (entry: unknown): boolean =>
    !!entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    ["allowDeposit", "allowWithdraw", "priority"].some((k) =>
        Object.hasOwn(entry as object, k),
    );

const NO_CONFIGS: StorageAbilityConfig[] = [];

describe("storageCompilerReconciler — cleanup contract (property)", () => {
    it("P2a: de-authoring all storage removes every storage artifact, preserves bystanders, and is idempotent", () => {
        fc.assert(
            fc.property(draftArb, ({ resources, draft }) => {
                const reconciled = structuredClone(draft);
                reconcileStorageCompilerArtifacts(reconciled, NO_CONFIGS);

                const state = reconciled.components.state ?? {};
                const tags = reconciled.tags ?? [];
                const bars = reconciled.components.display?.bars ?? [];
                const effects = reconciled.components.passiveEffects ?? [];
                const ruleIds = (reconciled.components.behavior?.rules ?? []).map(
                    (rule) => rule.id,
                );

                // Cleanup completeness: nothing storage-owned for any resource survives.
                for (const r of resources) {
                    expect(state[r]).toBeUndefined();
                    expect(state[`vals_entropy_${r}_0`]).toBeUndefined();
                    expect(state[`auto_req_${r}_timer_0`]).toBeUndefined();
                    expect(tags).not.toContain(`storage:${r}`);
                    expect(bars.map((b) => b.key)).not.toContain(`state.${r}`);
                    expect(ruleIds).not.toContain(`sys_auto_req_${r}_need_0`);
                }
                expect(
                    Object.values(state).some((entry) => storageOwned(entry)),
                ).toBe(false);

                // No collateral: every unrelated artifact is preserved.
                expect(state.keep_state).toEqual({ value: 5 });
                expect(tags).toContain("keep-me");
                expect(bars.map((b) => b.key)).toContain("state.keepbar");
                expect(ruleIds).toContain("sys_keep_rule");
                expect(
                    effects.some((e) => e.target === "self.state.keep.value"),
                ).toBe(true);

                // Idempotence (ph18 §3.3): a second reconcile changes nothing.
                const twice = structuredClone(reconciled);
                reconcileStorageCompilerArtifacts(twice, NO_CONFIGS);
                expect(twice).toEqual(reconciled);
            }),
            PINNED,
        );
    });
});
