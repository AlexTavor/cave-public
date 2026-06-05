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
- **`nanoid`/`ulid` — FIXED, zero debt.** All 8 engine uses (7 files) were burned down; nothing is suppressed. The gate is green and fails on any NEW use.

## How the id-generation was made deterministic

The burn-down split into two unrelated id problems:

1. **Compile-time ids — `compiler/conditions/compileStructuredConditions.ts`** (`nanoid` + `ulid`): compile-time ids made **compiled output non-reproducible**, breaking the compiler contract. Now derives a stable key from the condition kind + index. The ids were never load-bearing (the rules are always consumed as a `.compiled` condition; nothing sorts or keys on id/sortKey). Locked by a cross-compile deep-equal in `compileStructuredConditions.test.ts`.

2. **Runtime spawn ids — `handlers/mintSpawnId.ts`** (the shared helper). Entity ids feed `RuntimeEntityStore.getSortedEntities()` (sorted by `id.localeCompare`), and that order drives entity iteration and behavior-rule evaluation — so random ids make replay diverge. `mintSpawnId` mints `<prefix>_<n>` from a monotonic counter on `sys_world.state.spawnSerial` (passthrough state, same home as `bodySerial`, so it persists with saves and rebuilds identically on replay). Read-modify-write is safe because command handlers drain sequentially.
   - **Command-phase sites** (`SpawnHandler`, `AutomationSpawnHandler`, `resolveSpawnPeers`, `transferPendingBuilder`) call `mintSpawnId(context.world)` directly.
   - **Behavior-phase site** (`systems/behavior/actionExecutorSpawn.ts`) can't: the snapshot is read-only, so a sequential counter can't be read-then-written mid-tick. It enqueues `SPAWN` with no id plus an `assignTo` payload field; `SpawnHandler` mints the id and issues the `ASSIGN_BODIES_BATCH` in the command phase (the assignment was previously enqueued by the behavior action itself).
   - **`runtime/RuntimeCoreBase.ts`** — the runtime-instance id is read once, in a debug snapshot; it is **not** replay-affecting, so it just derives from the run `seed` (`runtime_<seed>`).

**Keep it green:** the gate stays at zero. If a new engine id source is needed, route it through `mintSpawnId` (entity ids) or a `(worldSeed, stableId)`-seeded derivation — never `nanoid`/`ulid`.

`src/game/handlers/spawnFromBlueprint.ts` (the game-layer spawn handler, outside this engine-scoped gate) also routes through `mintSpawnId` — game-spawned entities feed the same id-sort, so a random id there would have re-broken replay. The gate doesn't yet cover `src/game`; when a game-scoped determinism gate lands it should already be clean.
