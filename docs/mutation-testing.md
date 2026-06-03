# Mutation testing — engine/compiler slice

Line coverage lies: this slice had ~83% line coverage but only **57% mutation score** on a
compiler-unit-test-only run. We use [Stryker](https://stryker-mutator.io/) to measure whether tests
actually *detect* behavioral changes, and treat mutation score — not line coverage — as the quality
spec for the compiler.

## Run it

```bash
npx stryker run                              # full slice (~14 min): mutate src/engine/compiler/**
npx stryker run --mutate "src/engine/compiler/abilities/storage*.ts"   # scoped (fast, ~1 min)
node scripts/mutation-survivors.mjs                     # summary + per-file gap table
node scripts/mutation-survivors.mjs --clusters          # propose fan-out clusters
node scripts/mutation-survivors.mjs reports/mutation/mutation.json --file "storageCompiler.ts"  # per-mutant specs
```

## Config

- **`stryker.config.json`** — vitest runner, `coverageAnalysis: perTest`. Mutate scope = `src/engine/compiler/**` (the code under test).
- **`vitest.stryker.config.mjs`** — the *killer* scope (tests allowed to kill mutants): every non-UI
  dir that exercises the compiler — `compiler/runtime/linker/logic` + `game`. The compiler is consumed
  directly by runtime/game tests, so counting only compiler-dir tests *undercounts* the real score.
  Verified green under the node env (no jsdom). UI (jsdom) and phaser (canvas) are excluded.

Both reasons matter: with the honest killer scope the baseline is **62.5%**, not 57%.

## How survivors die

The dominant failure is **under-asserted pure functions** — the compiler emits exact engine keys/shapes
(`` `tag:storage:${resource}` ``, rule ids, token/action objects) and tests check "it compiled" or one
top-level field rather than the produced structure. The fix:

1. **Deep-equal the entire output** (`expect(result).toEqual({...})`) — pins every string/number/array/object at once.
2. **Cover `NoCoverage` branches** — add inputs that actually enter the untested path.
3. **Null/negative inputs** for `?.`, `typeof`, `?? []`, `&&`/`||` guards.
4. Assert **both sides** of every gating conditional.

Reference idiom: `src/engine/compiler/abilities/requiresCycleTrigger.test.ts` (a fully-killed file).

A scoped pilot (8 conversion/storage compiler files) went from **60.6% → 92.5%** with this method;
the residual survivors are largely equivalent mutants (defaults overwritten before observation, `??=`
reconstructing an identical value), so ~92–95% is the realistic per-file ceiling — don't chase 100%.
