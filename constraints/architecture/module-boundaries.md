# module-boundaries

**Enforced by `npm run depcruise`** (dependency-cruiser, `error` severity). This is a gate, not guidance — a violating import fails the build.

## The layer rule

`src/` is layered; dependencies may only point "down". The generic engine must not know about the specific game or the UI.

```
app-shell   composition root
  ↓
ui          presentation — may read game / engine / data
  ↓
game        game-specific systems — built on engine + data
  ↓
engine      GENERIC core — may use only data + utils (+ lib helpers)
  ↓
data        Zod schemas / blueprints — leaf
utils       pure deterministic helpers (pseudoRandom, worldSeed) — pure leaf
```

(`lib/` is a shared-module layer — `body-identity`, `displays`, `logic`, `terminal` — currently entangled with data/engine/ui; not yet constrained. Tracked as a follow-up.)

## Rules (each a dependency-cruiser `error`)

| Rule | Statement |
|---|---|
| `engine-stays-generic` | `src/engine` MUST NOT import `game`, `ui`, or `app-shell`. Keeps the engine reusable and **headless-runnable** — the deterministic balancing runner requires it. |
| `data-is-leaf` | `src/data` MUST NOT import `engine` / `game` / `ui` / `app-shell`. Schemas are a leaf the other layers depend on. |
| `utils-is-pure-leaf` | `src/utils` MUST NOT import any other `src` layer. |
| `no-circular` | No circular dependencies (hardened from `warn` → `error`). |

## Current debt — ratcheted, not ignored

40 pre-existing violations (34 `engine-stays-generic`, 6 `data-is-leaf`; some in test files) are frozen in `.dependency-cruiser-known-violations.json`. The gate **passes today but fails on any NEW violation** — the architecture can only get cleaner from here.

- **See the frozen debt:** `npm run depcruise:debt`
- **Burn it down:** fix a violation, then regenerate the baseline — `depcruise src --config .dependency-cruiser.cjs --output-type baseline > .dependency-cruiser-known-violations.json`. The count only ratchets down.

**Priority debt** (real source, not tests): `engine/balancing/HeadlessRunner.test.ts → game` (the headless runner must be generic), `engine/runtime/handlers/SpawnHandler.ts → game`, `engine/phaser/hooks/usePhaserGame.ts → ui`.
