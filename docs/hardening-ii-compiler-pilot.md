# Hardening II — PBT Pilot (Compiler) · Report Card & Verdict

An **enforce-or-drop** pilot of property-based testing (`fast-check`) on the HLL→LLL
compiler, graded by mutation testing (Stryker). Question: *does PBT bite — does it kill
domain-spanning survivors that the example suite missed?* Branch: `hardening-ii-compiler`.

## Verdict: **GREEN** (split result — the most useful kind)

PBT killed a **domain-spanning, examples-missed survivor** (P2b), with zero flakiness and
clean design provenance. The other modules returned **NULL on the money-metric but
surfaced real findings** — which is exactly the map we wanted: *where PBT pays vs. where it
doesn't.*

## Report card

| Prop | Module | Shape | Provenance | Before→After | Money-metric | Notes |
|---|---|---|---|---|---|---|
| **P1** | `compileStructuredConditions` | determinism (schema-derived gen) | `constraints/state/determinism.md`; ph18 §3.3 | 3→3 (0) | n/a (on-ramp) | Proves the harness end-to-end; locks determinism + id/sortKey-invariance over all inputs. Determinism ≠ structure, so kills 0 — as expected. |
| **P2b** | `samplerCompiler` | round-trip | ph13 `tv2_p_7_lld.md` §2.2 | 7→5 (**2**) | **1 (domain-spanning)** ✅ | Killed the `/\.value$/` **anchor** mutant — no single example distinguishes it; a generator with mid-path `.value` does. THE win. |
| **P3** | `collisionDetector(+Extras)` | decision-totality | ph13 `tv2_p_5_lld.md` §2.2 | 16→16 (0) | NULL | Correct behavior-lock, but survivors are inert (sentinels → `""`; dead `id` field; neutered path). **Surfaced a latent bug** (below). |
| **P2a** | `storageCompilerReconciler` | idempotence/conservation | ph18 §3.3, §5.3 | 17→17 (0) | NULL (behavior-lock) | Thorough property kills none — ~16/17 survivors are **dead code** (below). |

All four: seeds pinned → **0 flakiness**; runtime trivial (scoped Stryker ≈ 25–45s/module);
both PBT feedstocks exercised (schema-derived generator in P1; design-derived invariants in P2a/P2b/P3).

## The methodology map (the real lock-down result)

1. **PBT pays on shape/round-trip invariants with adversarial input structure.** P2b's anchor
   is the archetype: correctness ranges over the input *shape*, and the failing case
   (`a.value.b.value`) is one no hand-written example reaches. This is the money-metric.
2. **PBT adds ~no mutation value on an already-hardened subsystem.** The compiler sits at
   ~93% mutation; its residual ~7% survivors are overwhelmingly **dead/inert code** — a
   predicate subsumed by an earlier check (`cond4 ⊆ cond2` in storageReconciler), sentinel
   injections that don't collide, an unused struct field, runtime-dead optional chaining.
   **No test can kill dead code.** There, PBT's value is **behavior-lock (PIN)** and
   **bug discovery**, not score.
3. **Mutation survivors come in two flavors** — *weak-test* (PBT kills) vs *dead-code*
   (delete it). Triaging that split is now an explicit pilot output.
4. **Implication for the linker:** it has **never** been mutation-tested, so its survivors
   are unknown and likely include genuine test-adequacy gaps (not just dead code). That is
   where the PBT money-metric gets its real test. → proceed to the linker full mut+pbt run.

## Tooling validated

- `fast-check@^4.8.0` integrates cleanly with vitest; `it.fails` cleanly locks a known bug
  (auto-flips when fixed).
- Scoped Stryker before/after per module works: `npx stryker run --mutate '<path>'`.
- Full-report per-file slice == scoped-run result (validated: storageReconciler 17==17), so
  selection can read `reports/_compiler-full-head.json` without a re-run.
- `scripts/mutation-survivors.mjs <report> --file <x>` is the survivor lens.

## Code findings (routed to triage — not auto-fixed, per pilot guardrail)

1. **`collisionDetectorExtras.ts` — latent bug.** Sampler-target collision with an existing
   state key is **unreachable** (`nonSamplerState = stateKeys − samplerTargets`, then membership
   tested on a value that is always a samplerTarget). Contradicts ph13 §2.2 l.150. Locked by
   `collisionDetector.property.test.ts` P3c (`it.fails`). Routed (background task).
2. **`storageCompilerReconciler.ts` — dead code.** ~16 unkillable survivors: the cond4
   passive-effect predicate (l.103-110) is subsumed by the source-prefix check (l.92-100);
   `state?.[key]` (l.65, l.68) is runtime-dead. Pure cleanup, no behavior change. Routed.

## What ships

4 property tests (`*.property.test.ts`), `fast-check` dev-dep, this report. Mutation
config/thresholds **unchanged** (the pilot rides the existing compiler gate). The properties
are behavior-locks regardless of kill count; the one mutation-relevant win (P2b) holds the
compiler score steady while removing the anchor blind spot.
