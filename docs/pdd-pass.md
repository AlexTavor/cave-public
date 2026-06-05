# The PDD Pass

A cross-cutting **Proof-Driven Development pass** over the Cave codebase. It is *not* a
feature phase — it hardened the substrate (proof gates + clean architecture +
determinism) so that the next feature, **Bodies as Individuals** (the actual `phase-21`,
still a PRD), is built on solid ground.

> **What this branch really is.** The branch `phase-21-bodies-as-individuals` opened with
> a single commit (`docs/phase-21/prd.md`) and then accumulated **69 commits of this pass**.
> None of them are bodies-as-individuals feature code. This document is the map so the work
> can be followed; the feature is still ahead of us.

**Status:** complete. All gates green on the pass branch; 0 known boundary violations.

---

## Why a pass (the thesis)

The pass started as a *pilot*: try mutation testing on the one subsystem where correctness
is load-bearing and hard to eyeball — the **HLL→LLL compiler**. The pilot proved out, so
mutation testing was kept as a standing gate and the idea generalized into a set of
**enforceable proof gates**. Along the way the gates surfaced real **layer leakages**
(engine reaching into game/ui, data/lib importing upward), which we burned down to zero,
and **non-determinism** (raw `Math.random` / `nanoid` in the engine) that would have broken
the headless balancing runner — both fixed and now gated.

The throughline: **make correctness and structure mechanically enforced, not vibes.**

---

## Threads

### 1. Mutation testing (the pilot → a gate)
Stryker over `src/engine/compiler/**`; killers run from `engine/{compiler,runtime,linker,logic}`
+ `src/game/**`. Break threshold **90**, currently **~92.8%**. Proved that the compiler tests
actually *kill* mutants rather than merely cover lines. Kept as a CI/local gate.
- PRs: **#3** mutation-hardening-proof, **#7** compiler-mutation (+ residual hardening)
- Docs: `docs/mutation-testing.md`

### 2. Constraints & boundaries (the burn-down)
Enforceable module-boundary rules via dependency-cruiser, ratcheted against a known-violations
baseline. Four layering rules — `engine-stays-generic`, `data-is-leaf`, `lib-stays-low`,
`utils-is-pure-leaf` — taken from **44 known violations → 0** through dependency-inversion
seams (relocate mislocated helpers down; inject game/ui logic the engine calls; opaque
handles at lib boundaries).
- PRs: **#5** enforce-gates, **#6** roadmap, **#8** burn-down, **#10–#17** di-seam wave 1,
  **#18–#22** di-seam wave 2
- Config: `.dependency-cruiser.cjs`, `.dependency-cruiser-known-violations.json`

### 3. Determinism (the engine substrate)
The headless balancing runner replays runs and cannot tolerate `Math.random()` / unseeded IDs.
Seeded the engine RNG from `(worldSeed/epochSeed, stableId)`, banned `nanoid`/`ulid` in
`src/engine`, and proved replay end-to-end (`headlessReplay.determinism.test.ts`).
- PRs: **#9** balancing-seed-wipe, determinism commits within **#8**
- Gates: seeded-ids ban + `Math.random` ban in `src/engine`

---

## The gates this pass established (the lasting framework)

| Gate | What it enforces | How |
|------|------------------|-----|
| `tsc --noEmit` | types | strict, no `any`/`unknown` cop-outs in prod |
| `lint` | style + safety | eslint flat config, `--max-warnings 0` |
| `depcruise` | module boundaries | 4 layering rules, ratcheted baseline (now **0**) |
| seeded-ids / no-`Math.random` | determinism | banned in `src/engine` |
| `code-map:check` | doc freshness | hashes verified runtime-model anchors (6 sections) |
| `coverage` | test breadth | floors 81 / 68 / 78 / 84 |
| `stryker` | test strength | mutate `engine/compiler/**`, break 90 (~92.8%) |

## The proof (before → after)

| Metric | Result |
|--------|--------|
| Known boundary violations | **44 → 0** |
| Mutation score (engine/compiler) | **~92.8%** (break 90) |
| Test suite | **3299** passing |
| Coverage (stmt/branch/func/line) | ~82.9 / 70.3 / 79.7 / 85.1 |

## What graduated to the framework

Mutation testing began here as a one-subsystem pilot and **became a standing practice** —
the proof that "covered" ≠ "tested." The constraints-as-ratcheted-gates pattern likewise
generalizes beyond Cave.

---

## What's next (not part of this pass)

**Bodies as Individuals** — the real `phase-21` feature. Spec only so far:
`docs/phase-21/prd.md`. It builds on the hardened substrate above.
