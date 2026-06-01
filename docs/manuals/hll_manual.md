# Cave Engine Abilities Manual (HLL)

Reference for the high-level ability layer. Verified against the schemas in `src/data/schemas/abilities/` and the compilers in `src/engine/compiler/abilities/`. Field names, defaults, and enums are taken from the code.

## Overview

Abilities are high-level configuration stored on a Blueprint under `_editor.abilities`. During linking, the per-blueprint compiler translates abilities into runtime components (`state`, `behavior`, `powerSink`, `passiveEffects`, `assignment`, `buffs`, …).

**Source-of-truth rule:** `_editor.abilities` is authoritative. Components an ability manages are regenerated on each link; do not hand-edit them.

## Ability model

`src/data/schemas/abilities/index.ts`.

**Single abilities** — one entry per blueprint (object value):

`cycle`, `assignment`, `body`, `passport`, `worldPresence`, `notifications`, `conditionalActivation`, `unifiedBlueprints`

> Three of these hold list-shaped values even though they occupy a single key: `notifications` is an array of rules; `unifiedBlueprints` is an array of memberships; `conditionalActivation` accepts either a single entry **or** an array of entries.

**Repeatable abilities** — arrays, multiple entries allowed:

`storage`, `production`, `conversion`, `upkeep`, `injection`, `spawner`, `sampler`, `draft`, `updater`, `triggeredActions`

## Shared types

### ScalableValue

Many numeric fields scale with world population (`src/data/schemas/abilities/utils.ts`).

```ts
type ScalableValue = {
    base: number;        // default 0
    perBody: number;     // default 0
    multPerBody: number; // default 0
};
```

**Formula** (`src/engine/compiler/utils/scalableCompiler.ts`):

- If `multPerBody === 0`: `FinalValue = base + perBody * population`
- If `multPerBody !== 0`: `FinalValue = (base + perBody * population) * (multPerBody * population)`

`population` is the total world body count. Note there is **no `1 +`** in the multiplier — when `multPerBody` is non-zero the result is multiplied by `multPerBody * population` directly.

### ConditionLines vs StructuredConditions

Two different condition formats are used depending on the ability:

- **ConditionLines** (`abilities/conditions.ts`) — an array of logic-sentence **strings**. All must pass; an empty list means "always". Used by `cycle`, `production`, `conversion`, `draft`, `updater`, `triggeredActions`.

  ```json
  "conditions": ["self.state.food.value > 0", "global.season EQ summer"]
  ```

- **StructuredCondition[]** — structured condition objects (named conditions from `config.settings.conditions`, plus built-in condition kinds). Used by `spawner` and `conditionalActivation`.

### AbilityTriggers

When trigger-based abilities fire (`abilities/triggers.ts`). A non-empty array; default `["cycle_complete"]`.

```ts
type AbilityTriggerKind = "cycle_complete" | "assignment_complete";
```

## Ability reference

### Cycle (single)

The heartbeat of an entity: accumulates progress by drawing from the power grid and optional resource costs (`abilities/cycle.ts`).

| Field               | Type                  | Default                | Description                                       |
| ------------------- | --------------------- | ---------------------- | ------------------------------------------------- |
| `maxProgress`       | `ScalableValue`       | `{ base: 100 }`        | Energy to complete one cycle.                     |
| `inputs.body`       | `ScalableValue?`      | unset                  | Power demand from body. (optional, no default)    |
| `inputs.mind`       | `ScalableValue?`      | unset                  | Power demand from mind.                           |
| `inputs.social`     | `ScalableValue?`      | unset                  | Power demand from social.                         |
| `resourceCosts`     | `CycleResourceCost[]` | `[]`                   | Resource costs consumed while cycling.            |
| `costMultPerCycle`  | `number` (≥0)         | `0`                    | Cost multiplier applied after each completed cycle.|
| `transformTo`       | `string?`             | unset                  | Blueprint id to transform into on completion.     |
| `keepProgress`      | `boolean?`            | unset                  | Reserved for lifecycle transitions.               |
| `oneOff`            | `boolean`             | `false`                | Self-destruct when storage empties after a cycle. |
| `showProgressBar`   | `boolean?`            | unset                  | Show the progress bar.                            |
| `showThrottleSlider`| `boolean?`            | unset                  | Show the throttle slider.                         |
| `startActive`       | `boolean?`            | unset                  | Start active.                                     |
| `conditions`        | `ConditionLines`      | `[]`                   | Gate cycle progress.                              |

**CycleResourceCost** (`abilities/cycle.ts`):

| Field                            | Type            | Default         | Description                       |
| -------------------------------- | --------------- | --------------- | --------------------------------- |
| `resource`                       | `string`        | —               | Required.                         |
| `amount`                         | `ScalableValue` | `{ base: 0 }`   | Consumed per request.             |
| `requestPerSecondAtFullThrottle` | `number` (>0)   | `10`            | Pull rate from storage.           |
| `requestCadenceSeconds`          | `number` (>0)   | `1`             | How often the cost is requested.  |
| `scaleByBodiesOwned`             | `boolean`       | `false`         | Scale cost by assigned bodies.    |
| `scaleByCyclesCompleted`         | `boolean`       | `false`         | Scale cost by completed cycles.   |
| `visible`                        | `boolean`       | `true`          | Show a bar.                       |
| `barPosition` / `barColorHex` / `barPaletteColorKey` | — | unset    | Optional bar styling.             |
| `priority`                       | `number`        | `0`             | Pull priority.                    |

### Body (single)

Biological/progression scaffolding (`abilities/body.ts`).

| Field            | Type                 | Default                    |
| ---------------- | -------------------- | -------------------------- |
| `baseAttributes` | `{ body, mind, social }` | `{ body: 1, mind: 1, social: 1 }` |
| `health`         | `number`             | `100`                      |
| `traits`         | `string[]`           | `[]`                       |
| `xp`             | `number`             | `0`                        |
| `level`          | `number`             | `1`                        |
| `rules`          | `BehaviorRule[]?`    | unset                      |

### Passport (single)

Identity and display metadata (`abilities/passport.ts`).

| Field         | Type      | Default     |
| ------------- | --------- | ----------- |
| `label`       | `string`  | `"Unknown"` |
| `icon`        | `string?` | unset       |
| `glyphKey`    | `string?` | unset       |
| `description` | `string?` | unset       |
| `styleId`     | `string?` | unset       |
| `parent`      | `EntityTargetSpec?` | unset |
| `nervousVein` | `boolean` | `false`     |
| `permanent`   | `boolean` | `false`     |

### WorldPresence (single)

Spatial placement and render-radius binding (`abilities/worldPresence.ts`).

| Field    | Type           | Default | Notes                                |
| -------- | -------------- | ------- | ------------------------------------ |
| `x`      | `number`       | `0`     |                                      |
| `y`      | `number`       | `0`     |                                      |
| `radius` | `SpatialRadius`| —       | Required. `{ min (10), max (20), valueRef?, maxRef? }`. |

### Storage (repeatable)

Creates a named resource slot (`abilities/storage.ts`).

| Field          | Type            | Default | Notes                                            |
| -------------- | --------------- | ------- | ------------------------------------------------ |
| `resource`     | `string`        | —       | Required.                                        |
| `displayName`  | `string?`       | unset   |                                                  |
| `initialValue` | `number` (≥0)   | `0`     | Starting value.                                  |
| `capacity`     | `ScalableValue` | `{ base: 0 }` | Max capacity.                              |
| `isDefault`    | `boolean`       | `true`  | Adds `storage:<resource>` tag.                   |
| `entropy`      | `ScalableValue` | `{ base: 0 }` | Passive decay per second.                  |
| `visible`      | `boolean`       | `true`  | Adds a UI bar.                                   |
| `allowDeposit` | `boolean`       | `true`  | Allow external transfers in.                     |
| `allowWithdraw`| `boolean`       | `true`  | Allow external transfers out.                    |
| `priority`     | `number`        | `0`     | Pull/contention priority.                        |
| `barPosition` / `barColorHex` / `barPaletteColorKey` | — | unset | Optional bar styling.                  |
| `autoRequest`  | `StorageAutoRequest?` | unset | Auto-pull config (see below).               |

**StorageAutoRequest** (`abilities/storageAutoRequest.ts`): `enabled` (default `false`), `cadence_s` (>0, default `1`), `source?`, `minRequest` (≥0, default `1`), `maxRequest` (>0, default `999999`); requires `minRequest ≤ maxRequest`.

### Production (repeatable)

Transfers produced resources when triggered (`abilities/production.ts`).

| Field        | Type             | Default                | Notes                              |
| ------------ | ---------------- | ---------------------- | ---------------------------------- |
| `id`         | `string`         | auto (nanoid)          |                                    |
| `resource`   | `string`         | —                      | Required.                          |
| `amount`     | `ScalableValue`  | `{ base: 0 }`          | Amount per trigger.                |
| `target`     | `string?`        | unset (→ `tag:storage:<resource>` at compile) | Destination id or tag. |
| `triggers`   | `AbilityTriggers`| `["cycle_complete"]`   |                                    |
| `conditions` | `ConditionLines` | `[]`                   |                                    |

**Requires** a `cycle` ability when triggered by `cycle_complete`.

### Conversion (repeatable)

Consumes inputs and grants outputs on completion (`abilities/conversion.ts`).

| Field        | Type                          | Default                | Notes                                  |
| ------------ | ----------------------------- | ---------------------- | -------------------------------------- |
| `id`         | `string`                      | `"default"`            |                                        |
| `inputs`     | `{ resource, amount }[]`      | `[]`                   |                                        |
| `outputs`    | `{ resource, amount, target? }[]` | `[]`               |                                        |
| `resetCycle` | `boolean`                     | `true`                 | Reset cycle on completion.             |
| `triggers`   | `AbilityTriggers`             | `["cycle_complete"]`   |                                        |
| `conditions` | `ConditionLines`              | `[]`                   |                                        |

**Requires** a `cycle` ability. If a cycle exists **and** any conversion has `resetCycle !== false`, the compiler errors (both write `state.cycle`).

### Upkeep (repeatable)

Consumes a resource passively and toggles a trait on failure (`abilities/upkeep.ts`).

| Field          | Type            | Default | Notes                                       |
| -------------- | --------------- | ------- | ------------------------------------------- |
| `resource`     | `string`        | —       | Required.                                   |
| `displayName`  | `string?`       | unset   |                                             |
| `rate`         | `ScalableValue` | `{ base: 0 }` | Consumption per second.               |
| `failureTrait` | `string`        | —       | Required. Trait toggled when empty.         |
| `autoRequest`  | `boolean`       | `true`  | Auto-transfer from `tag:storage:<resource>`.|
| `isImmediate`  | `boolean?`      | unset   | Use immediate transfers.                    |
| `requestSource`| `string?`       | unset   | Override the auto-request source.           |

Upkeep is passive — it has **no `triggers`** field. The compiler adds a `susceptible_to_<failureTrait>` tag and emits `ADD_TRAIT`/`REMOVE_TRAIT` rules. (A `warning` is raised if there is no matching storage for the resource.)

### Injection (repeatable)

Applies passive effects to other entities by tag (`abilities/injection.ts`). Compiles into `components.buffs`.

| Field       | Type       | Notes                            |
| ----------- | ---------- | -------------------------------- |
| `targetTag` | `string`   | Required.                        |
| `effects`   | `Effect[]` | `{ op, target, value }` each.    |

`op` is `SET | ADD | SUB | MULT | DIV`.

### Assignment (single)

Accepts assigned bodies and optionally defines completion results (`abilities/assignment.ts`).

| Field         | Type                | Default | Notes                                    |
| ------------- | ------------------- | ------- | ---------------------------------------- |
| `slots`       | `number` (≥0)       | `1`     | Max assigned bodies.                     |
| `locking`     | `boolean`           | `false` | Prevent automatic recall.                |
| `filter`      | `AssignmentFilterRule[]` | `[]` | Assignment filter conditions.          |
| `minimums`    | `AssignmentMinimumRule[]` | `[]`| Minimum-attribute requirements.         |
| `duration`    | `number` (≥0)       | `0`     | Assignment duration.                     |
| `showProgress`| `boolean?`          | unset   | Show a progress bar.                     |
| `oneOff`      | `boolean`           | `false` | Single-use assignment.                   |
| `results`     | `AssignmentResult[]`| `[]`    | Actions on completion (see below).       |

**AssignmentResult** is a discriminated union: `destroy_assigned_bodies`, `spawn_resource` (`{ resource, source: fixed|attribute|lifetime_xp, attribute?: body|mind|social, factor (default 1), target (default "sys_world") }`), or `transfer_habiti`. At most one `destroy_assigned_bodies` and one `transfer_habiti` per assignment.

### Spawner (repeatable)

Creates entities when triggered (`abilities/spawner.ts`).

| Field           | Type                   | Default                | Notes                              |
| --------------- | ---------------------- | ---------------------- | ---------------------------------- |
| `id`            | `string`               | auto (nanoid)          |                                    |
| `blueprintId`   | `string`               | —                      | Required.                          |
| `count`         | `ScalableValue`        | `{ base: 1 }`          | Number to spawn.                   |
| `mode`          | `spawn \| spawn_body`  | `spawn_body`           |                                    |
| `target`        | `string`               | `"sys_world"`          | Target for `spawn_body`.           |
| `parentOnSpawn` | `none \| self`         | `none`                 |                                    |
| `forcedHabiti`  | `string[]`             | `[]`                   | Deduplicated.                      |
| `triggers`      | `AbilityTriggers`      | `["cycle_complete"]`   |                                    |
| `conditions`    | `StructuredCondition[]`| `[]`                   | **Structured**, not strings.       |

**Requires** a `cycle` ability when triggered by `cycle_complete`. Warns if `blueprintId` is unknown (when the blueprint set is available to the validator).

### Sampler (repeatable)

Mirrors a value from another state path into this entity when triggered (`abilities/sampler.ts`).

| Field     | Type             | Default              | Notes                                   |
| --------- | ---------------- | -------------------- | --------------------------------------- |
| `id`      | `string`         | auto (nanoid)        |                                         |
| `source`  | `string`         | —                    | Required. State path to mirror.         |
| `target`  | `string`         | `"sampled_value"`    | Target state key.                       |
| `visible` | `boolean`        | `true`               | Show a bar.                             |
| `max`     | `number`         | `100`                | Initial max for the sampled state.      |
| `triggers`| `AbilityTriggers`| `["cycle_complete"]` |                                         |

Sampler has **no `conditions`** field. **Requires** a `cycle` ability when triggered by `cycle_complete`. Duplicate targets and collisions with existing/reserved state keys are errors.

### Draft (repeatable)

Triggers a draft pool when fired (`abilities/draft.ts`).

| Field        | Type              | Default              | Notes                              |
| ------------ | ----------------- | -------------------- | ---------------------------------- |
| `id`         | `string`          | auto (nanoid)        |                                    |
| `poolId`     | `string`          | —                    | Required.                          |
| `count`      | `number` (1–5)    | `3`                  | Options to present.                |
| `label`      | `string?`         | unset                |                                    |
| `triggers`   | `AbilityTriggers` | `["cycle_complete"]` |                                    |
| `conditions` | `ConditionLines`  | `[]`                 |                                    |
| `onComplete` | `BehaviorAction[]?`| unset               | Run after an option is selected.   |

**Requires** a `cycle` ability when triggered by `cycle_complete`.

### Updater (repeatable)

Mutates a target state path when fired (`abilities/updater.ts`).

| Field        | Type              | Default              | Notes                              |
| ------------ | ----------------- | -------------------- | ---------------------------------- |
| `id`         | `string`          | auto (nanoid)        |                                    |
| `target`     | `string`          | —                    | Required.                          |
| `op`         | `SET \| ADD \| SUB`| `ADD`               |                                    |
| `value`      | `number \| string`| `1`                  | Value or logic reference.          |
| `triggers`   | `AbilityTriggers` | `["cycle_complete"]` |                                    |
| `conditions` | `ConditionLines`  | `[]`                 |                                    |

When triggered by `cycle_complete` with no cycle present, the compiler raises a **warning** (not an error).

### TriggeredActions (repeatable)

Executes arbitrary behavior actions when fired (`abilities/triggeredActions.ts`).

| Field        | Type               | Default              | Notes                              |
| ------------ | ------------------ | -------------------- | ---------------------------------- |
| `id`         | `string`           | auto (nanoid)        |                                    |
| `triggers`   | `AbilityTriggers`  | `["cycle_complete"]` |                                    |
| `conditions` | `ConditionLines`   | `[]`                 |                                    |
| `actions`    | `BehaviorAction[]` | — (min 1)            | Required.                          |

**Requires** a `cycle` ability when triggered by `cycle_complete`.

### Notifications (single)

An **array** of notification rules shown to the player as guidance modals (`abilities/notifications.ts`). Each rule is the modal-guidance content extended with an auto-generated `id`.

### ConditionalActivation (single)

Conditionally activates/deactivates other abilities (`abilities/conditionalActivation.ts`). Accepts a single entry or an array.

| Field                 | Type                            | Default | Description                                       |
| --------------------- | ------------------------------- | ------- | ------------------------------------------------- |
| `priority`            | `number`                        | `0`     | Evaluation order.                                 |
| `conditions`          | `StructuredCondition[]`         | `[]`    | Must pass for targets to be active.               |
| `targets`             | `ConditionalActivationTarget[]` | `[]`    | Abilities to toggle.                              |
| `inactiveExplanation` | `string?`                       | unset   | UI message shown when inactive.                   |

**ConditionalActivationTarget**: `{ ability, targetId? }`. `ability` is one of the toggleable ability keys (it does **not** include `unifiedBlueprints` or `conditionalActivation` itself). `targetId` narrows to a specific repeatable entry.

### UnifiedBlueprints (single)

An **array** of cohort memberships (`abilities/unifiedBlueprints.ts`). Each: `{ tag, spawnWhenPeerSpawns (default false) }`. Cohort members share a tag and can be managed together; `spawnWhenPeerSpawns: true` auto-spawns when any peer spawns.

## Validation rules

Run by the collision detector during compile (`src/engine/compiler/validation/`). Severity (`error` blocks; `warning` is advisory) is noted.

**Malformed entries** (`error`): a `storage`/`production`/`upkeep` entry missing `resource`; a `conversion` input/output missing `resource`; a `spawner` missing `blueprintId`; a `sampler` missing `source`.

**Duplicates** (`error`): duplicate `storage`, `production`, or `upkeep` for the same resource. Duplicate `sampler` targets.

**Resource bars** (`error`): a visible storage entry or visible cycle resource-cost without a `barPosition`; two visible bars sharing a `barPosition`.

**Cycle/conversion collision** (`error`): a `cycle` plus any `conversion` with `resetCycle !== false` (both write `state.cycle`).

**Cycle dependency** — an ability triggered by `cycle_complete` requires a `cycle` ability:

| Ability            | Severity |
| ------------------ | -------- |
| `production`       | error    |
| `spawner`          | error    |
| `sampler`          | error    |
| `draft`            | error    |
| `triggeredActions` | error    |
| `updater`          | warning  |

**Sampler collision** (`error`): a sampler `target` that collides with an existing non-sampler state key or a reserved key (`cycle`, `physics`, `display`).

**Spawner target** (`warning`): `blueprintId` not found among known blueprints (only checked when the validator is given the blueprint set).

**Upkeep orphan** (`warning`): an upkeep resource with no matching storage.

## Common patterns

**Basic producer** — `cycle` (`maxProgress: { base: 100 }`, `inputs.body: { base: 10 }`) + `production` (`resource: "wood"`, `amount: { base: 1 }`).

**Processor** — storage inputs/outputs + `cycle` with inputs + `conversion` consuming inputs and emitting outputs.

**Living worker** — hidden food storage + `upkeep` (`autoRequest: true`, `failureTrait: "malnourished"`) + a `cycle` for labor.

**Spawner** — `cycle` + `spawner` (`mode: "spawn_body"`, `target: "sys_world"`).

**Sampler** — `cycle` + `sampler` (`source: "sys_world.state.notoriety.value"`).

**Escalating cost** — `cycle` with `resourceCosts` and `costMultPerCycle > 0`.

**Conditional feature unlock** — `conditionalActivation` with structured conditions gating a `production` or `cycle` ability.
