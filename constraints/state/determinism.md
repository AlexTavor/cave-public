# determinism

**Enforced by `npm run lint`** (ESLint, `error` severity) in `src/engine` (benchmarks exempt). This is a gate, not guidance — a violating call/import fails the build.

## The rule

The engine is **headless-replayable**: the deterministic balancing runner replays a run from `(worldSeed, stableId)` and must get a bit-identical result. So engine sim code may not use any non-deterministic source of randomness or identity.

| Banned in `src/engine` | Use instead |
|---|---|
| `Math.random()` | `pseudoRandom(seed)` from `src/utils/pseudoRandom.ts`, seeded from `(worldSeed, stableId)` |
| `nanoid()` / `ulid()` | A deterministic id seeded from `worldSeed` + a monotonic counter/serial (cf. the `bodySerial` pattern in `spawnBodyIdentity.ts`) |

`*.bench.ts` is exempt (benchmarks aren't on the sim path).

## Gate (ESLint, scoped to `src/engine/**`, excl. `*.bench.ts`)

| Rule | Bans |
|---|---|
| `no-restricted-properties` | `Math.random` |
| `no-restricted-imports` | `nanoid`, `ulid` |

## Status

- **`Math.random` — FIXED, zero debt.** The 4 engine sites (`transferBodies.ts` ×3, `actionExecutorSpawn.ts`) were routed through `pseudoRandom`. Gate is green with nothing suppressed.
- **`nanoid`/`ulid` — gated, debt ratcheted.** 8 pre-existing uses (7 files) are frozen in `eslint-suppressions.json`. The gate **passes today but fails on any NEW use** — engine id-generation can only get more deterministic from here. (Fixing all 8 at once is a determinism-critical refactor with broad test ripple, so it is ratcheted, not big-banged — per "ratchet large debt, fix small debt".)

## Burn-down (the 7 ratcheted files)

Each needs a deterministic id source (a seeded counter) threaded in. Priority:

1. **`compiler/conditions/compileStructuredConditions.ts`** (`nanoid` + `ulid`) — highest value: compile-time ids make **compiled output non-reproducible**, breaking the compiler contract. Derive from the blueprint id + a per-compile condition index.
2. **`runtime/systems/behavior/actionExecutorSpawn.ts`**, **`handlers/SpawnHandler.ts`**, **`handlers/AutomationSpawnHandler.ts`**, **`handlers/spawnUnifiedBlueprints/resolveSpawnPeers.ts`** — spawn entity ids; need a deterministic spawn counter (none exists in `BehaviorContext` today — that plumbing is the work).
3. **`runtime/handlers/transferPendingBuilder.ts`** — `pending_${nanoid()}` transient body id.
4. **`runtime/RuntimeCoreBase.ts`** — runtime-instance id; confirm whether it is replay-affecting before fixing.

**See the frozen debt:** the `no-restricted-imports` entries in `eslint-suppressions.json`.
**Burn it down:** fix a site, then `npx eslint . --prune-suppressions` drops the resolved entry. The count only ratchets down.

(`src/game/handlers/spawnFromBlueprint.ts` has one more site, outside this engine-scoped gate — fold in when game determinism is constrained.)
