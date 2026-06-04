# coverage-floor

**Enforced by `npm run coverage`** (`vitest run --coverage`; thresholds in `vitest.config.mjs`). Coverage below the floor fails the run — a gate, not a report.

## The rule

Test coverage may not regress. Floors are set just under current so any meaningful drop fails while minor fluctuation passes.

| Metric | Floor | Current |
|---|---|---|
| Statements | 81% | 82.76% |
| Branches | 68% | 69.77% |
| Functions | 78% | 79.69% |
| Lines | 84% | 85.03% |

Global, across `src`. Per-file `// @vitest-environment` docblocks put UI tests on jsdom; the default env is `node`.

## Ratchet UP

One-way ratchet: as coverage improves, raise the floor in `vitest.config.mjs` to lock the gain in. Never lower it to make a change pass — add tests.

## Notes

- **Branch coverage (~70%) is the weakest metric** — the highest-value place to add tests, and it overlaps the engine mutation-survivor work (untested branches are exactly what survive mutation).
- This is a coarse global gate (regression net). It is *not* the engine quality bar — that is Stryker mutation testing (own config, unaffected here).
