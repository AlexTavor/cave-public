# Cave Engine Abilities Manual (HLL)

Canonical reference for the Designer Mode ability compiler.

## Overview

Abilities are high-level configuration entries stored in a Blueprint under `_editor.abilities`. The compiler runs on save and translates abilities into runtime components (`state`, `behavior`, `powerSink`, `passiveEffects`, `assignment`, `buffs`, etc.).

**Compiler rule:** `_editor` is the source of truth. Manual edits to compiled components are overwritten on save.

## Ability model

**Single abilities** (only one entry allowed per blueprint):

- `cycle`
- `assignment`
- `body`
- `passport`
- `worldPresence`
- `notifications`
- `conditionalActivation`
- `unifiedBlueprints`

**Repeatable abilities** (arrays; multiple entries allowed):

- `storage`
- `production`
- `conversion`
- `upkeep`
- `injection`
- `spawner`
- `sampler`
- `draft`
- `updater`
- `triggeredActions`

## Shared types

### ScalableValue

Many numeric fields scale with population.

```ts
type ScalableValue = {
    base: number;       // flat base value
    perBody: number;    // added per body in the world
    multPerBody: number; // multiplier per body in the world
};
```

Formula: `FinalValue = (base + perBody * population) * (1 + multPerBody * population)`

### ConditionLines

A list of logic sentence strings. All conditions must pass. An empty list means always.

```json
"conditions": ["self.state.food.value > 0", "global.season EQ summer"]
```

### AbilityTriggers

Controls when trigger-based abilities fire.

```ts
type AbilityTriggerKind = "cycle_complete" | "assignment_complete";
```

Default: `["cycle_complete"]`.

## Ability reference

### Cycle

The heartbeat of an entity. Accumulates progress by drawing from the power grid and optional resource costs.

**Fields**

| Field               | Type                   | Description                                                       |
| ------------------- | ---------------------- | ----------------------------------------------------------------- |
| `maxProgress`       | `ScalableValue`        | Energy required to complete one cycle. Default: `{ base: 100 }`. |
| `inputs.body`       | `ScalableValue`        | Power demand from the body attribute.                             |
| `inputs.mind`       | `ScalableValue`        | Power demand from the mind attribute.                             |
| `inputs.social`     | `ScalableValue`        | Power demand from the social attribute.                           |
| `resourceCosts`     | `CycleResourceCost[]`  | Additional resource costs consumed each cycle tick.               |
| `costMultPerCycle`  | `number`               | Multiplier applied to costs after each completed cycle. Default: `0`. |
| `transformTo`       | `string`               | Blueprint id to transform into on completion.                     |
| `keepProgress`      | `boolean`              | Reserved for lifecycle transitions.                               |
| `oneOff`            | `boolean`              | If true, the entity self-destructs when storage is empty after cycle. |
| `showProgressBar`   | `boolean`              | Show cycle progress bar in UI.                                    |
| `showThrottleSlider`| `boolean`              | Show throttle slider in UI.                                       |
| `startActive`       | `boolean`              | Start the cycle in active state.                                  |
| `conditions`        | `ConditionLines`       | Condition list gating cycle progress.                             |

**CycleResourceCost fields**

| Field                          | Type      | Description                                              |
| ------------------------------ | --------- | -------------------------------------------------------- |
| `resource`                     | `string`  | Resource id to consume.                                  |
| `amount`                       | `ScalableValue` | Amount consumed per tick at full throttle.          |
| `requestPerSecondAtFullThrottle` | `number`| Pull rate from storage. Default: `10`.                  |
| `requestCadenceSeconds`        | `number`  | How often the resource is requested. Default: `1`.       |
| `scaleByBodiesOwned`           | `boolean` | Scale cost by bodies assigned to this entity.            |
| `scaleByCyclesCompleted`       | `boolean` | Scale cost by number of completed cycles.                |
| `visible`                      | `boolean` | Show a bar for this cost. Default: `true`.               |
| `barPosition`                  | `string`  | Optional UI bar position slot.                           |
| `barColorHex`                  | `string`  | Optional hex color for bar.                              |
| `priority`                     | `number`  | Pull priority. Default: `0`.                             |

**Compiler output**

- `state.cycle`, `state.cycle_active` entries.
- `state.is_depleted` when `oneOff` is enabled.
- `powerSink.baseDemand` values and accumulation rule.
- Resource cost pull rules per entry.
- Optional transform, cycle reset, and one-off GC rules.

### Body

Biological and progression scaffolding.

**Fields**

| Field            | Type                   | Description                            |
| ---------------- | ---------------------- | -------------------------------------- |
| `baseAttributes` | `{ body, mind, social }` | Base attribute values.               |
| `health`         | `number`               | Starting health and max health.        |
| `xp`             | `number`               | Starting XP.                           |
| `level`          | `number`               | Starting level.                        |
| `traits`         | `string[]`             | Initial trait ids.                     |

**Compiler output**

- `components.body` with base attributes, health values, xp/level scaffolding, and trait list.

### Passport

Identity and display metadata for a blueprint.

**Fields**

| Field         | Type     | Description                                                              |
| ------------- | -------- | ------------------------------------------------------------------------ |
| `label`       | `string` | Display label.                                                           |
| `icon`        | `string` | Icon id.                                                                 |
| `description` | `string` | Optional descriptive text.                                               |
| `styleId`     | `string` | Optional style id; references `assets.styles` keys.                     |

**Compiler output**

- Blueprint-level label.
- `components.display` identity fields.
- Safe merge into body passport metadata when body exists.

### WorldPresence

Spatial placement and render radius binding.

**Fields**

| Field             | Type     | Description                               |
| ----------------- | -------- | ----------------------------------------- |
| `x`               | `number` | World X position.                         |
| `y`               | `number` | World Y position.                         |
| `radius.min`      | `number` | Minimum display radius.                   |
| `radius.max`      | `number` | Maximum display radius.                   |
| `radius.valueRef` | `string` | State path for current radius value.      |
| `radius.maxRef`   | `string` | State path for current radius max.        |

**Compiler output**

- `components.spatial` and radius references.
- Safe updates to physics/display radius fields when present.

### Storage (repeatable)

Creates a named resource storage slot.

**Fields**

| Field          | Type            | Description                                                      |
| -------------- | --------------- | ---------------------------------------------------------------- |
| `resource`     | `string`        | Resource id (e.g. `wood`, `food`).                              |
| `capacity`     | `ScalableValue` | Storage max capacity.                                            |
| `visible`      | `boolean`       | Adds a UI bar when true. Default: `true`.                        |
| `isDefault`    | `boolean`       | Adds `storage:<resource>` tag.                                   |
| `entropy`      | `ScalableValue` | Passive decay per second.                                        |
| `allowDeposit` | `boolean`       | Allows external transfers into this storage. Default: `true`.    |

**Compiler output**

- `state.<resource>` entry with value/max/visible.
- `state.<resource>.allowDeposit` flag.
- Optional `passiveEffects` for entropy.
- If `isDefault`, adds tag `storage:<resource>`.
- If blueprint has a display radius and this is the first storage entry, radius refs are bound to this resource.

### Production (repeatable)

Transfers produced resources on cycle completion.

**Fields**

| Field        | Type            | Description                                             |
| ------------ | --------------- | ------------------------------------------------------- |
| `resource`   | `string`        | Resource to produce.                                    |
| `amount`     | `ScalableValue` | Amount per cycle.                                       |
| `target`     | `string`        | Target id or tag. Default: `tag:storage:<resource>`.    |
| `conditions` | `ConditionLines` | Condition list gating production.                      |

**Compiler output**

- Scalable amount state entry and `TRANSFER` rule on cycle completion.

**Notes**: Requires a `cycle` ability.

### Conversion (repeatable)

Consumes inputs and grants outputs on cycle completion.

**Fields**

| Field        | Type                     | Description                                   |
| ------------ | ------------------------ | --------------------------------------------- |
| `id`         | `string`                 | Identifier for the conversion rule.           |
| `inputs`     | `{ resource, amount }[]` | Resources to consume.                         |
| `outputs`    | `{ resource, amount }[]` | Resources to produce.                         |
| `resetCycle` | `boolean`                | Reset cycle on completion. Default: `true`.   |
| `conditions` | `ConditionLines`         | Condition list gating conversion.             |

**Notes**: Requires a `cycle` ability. Collision error if `resetCycle` is true and cycle also writes to `state.cycle`.

### Upkeep (repeatable)

Consumes resources every tick and toggles a trait on failure.

**Fields**

| Field          | Type            | Description                                      |
| -------------- | --------------- | ------------------------------------------------ |
| `resource`     | `string`        | Resource to consume.                             |
| `rate`         | `ScalableValue` | Consumption rate per second.                     |
| `failureTrait` | `string`        | Trait id toggled when resource is empty.         |
| `autoRequest`  | `boolean`       | Auto-transfer from `tag:storage:<resource>`.     |

**Compiler output**

- Scalable demand state entries and passiveEffects.
- Rules to toggle `failureTrait` via `ADD_TRAIT` / `REMOVE_TRAIT`.
- Adds tag `susceptible_to_<failureTrait>`.

### Injection (repeatable)

Applies passive effects to other entities via tags.

**Fields**

| Field       | Type       | Description                      |
| ----------- | ---------- | -------------------------------- |
| `targetTag` | `string`   | Tag to match on target entities. |
| `effects`   | `Effect[]` | Operations to apply.             |

**Effect**: `{ op: SET|ADD|SUB|MULT|DIV, target: string, value?: number }`

**Compiler output**: `components.buffs` with tag/effects pairs.

### Assignment

Accepts assigned proxies and optionally defines absorb outputs.

**Fields**

| Field                | Type                 | Description                    |
| -------------------- | -------------------- | ------------------------------ |
| `slots`              | `number`             | Max assigned entities.         |
| `locking`            | `boolean`            | Prevents automatic recall.     |
| `filter`             | `Condition[]`        | Assignment filter conditions.  |
| `processing_outputs` | `ProcessingOutput[]` | Absorb output configuration.   |

**ProcessingOutput**

| Field       | Type                       | Description                                |
| ----------- | -------------------------- | ------------------------------------------ |
| `resource`  | `string`                   | Resource to produce.                       |
| `source`    | `fixed|attribute|lifetime_xp` | Value source.                           |
| `attribute` | `body|mind|social`         | Required when `source` is `attribute`.     |
| `factor`    | `number`                   | Multiplier applied to source.              |
| `target`    | `string`                   | Destination (`sys_world`, `self`, or id).  |

### Spawner (repeatable)

Creates entities on cycle or assignment completion.

**Fields**

| Field         | Type            | Description                        |
| ------------- | --------------- | ---------------------------------- |
| `blueprintId` | `string`        | Blueprint to spawn.                |
| `count`       | `ScalableValue` | Number of spawns (uses `base`).    |
| `mode`        | `spawn|spawn_body` | Spawn type.                     |
| `target`      | `string`        | Target for `spawn_body`.           |
| `triggers`    | `AbilityTriggers` | When to fire. Default: `["cycle_complete"]`. |
| `conditions`  | `ConditionLines` | Condition list.                   |

**Notes**: Requires a `cycle` ability (when triggered by cycle).

### Sampler (repeatable)

Mirrors a value from another state path into this entity when triggered.

**Fields**

| Field     | Type      | Description                                       |
| --------- | --------- | ------------------------------------------------- |
| `source`  | `string`  | State path to mirror.                             |
| `target`  | `string`  | Target state key (fallback if derivation fails).  |
| `visible` | `boolean` | Show a UI bar for the sampled value.              |
| `max`     | `number`  | Initial max for the sampled state.                |
| `triggers`| `AbilityTriggers` | When to sample. Default: `["cycle_complete"]`. |
| `conditions` | `ConditionLines` | Condition list.                         |

**Target derivation**: If `source` ends with `.value` or `.max`, the base segment becomes `sampled_<segment>` (with non-word chars as `_`). Example: `sys_world.state.cycle.value` → `sampled_cycle`.

### Draft (repeatable)

Triggers a draft pool when the trigger fires.

**Fields**

| Field        | Type             | Description                                          |
| ------------ | ---------------- | ---------------------------------------------------- |
| `id`         | `string`         | Auto-generated nanoid.                               |
| `poolId`     | `string`         | Draft pool id to trigger.                            |
| `count`      | `number`         | Number of options to present (1–5). Default: `3`.    |
| `label`      | `string`         | Optional UI label for the draft prompt.              |
| `triggers`   | `AbilityTriggers`| When to trigger. Default: `["cycle_complete"]`.      |
| `conditions` | `ConditionLines` | Condition list.                                      |
| `onComplete` | `BehaviorAction[]` | Actions to run after a draft option is selected.   |

### Updater (repeatable)

Mutates a target state path when the trigger fires.

**Fields**

| Field        | Type             | Description                                       |
| ------------ | ---------------- | ------------------------------------------------- |
| `id`         | `string`         | Auto-generated nanoid.                            |
| `target`     | `string`         | State path to update.                             |
| `op`         | `SET|ADD|SUB`    | Mutation operation. Default: `ADD`.               |
| `value`      | `number|string`  | Value or logic reference.                         |
| `triggers`   | `AbilityTriggers`| When to fire. Default: `["cycle_complete"]`.      |
| `conditions` | `ConditionLines` | Condition list.                                   |

### TriggeredActions (repeatable)

Executes arbitrary behavior actions when the trigger fires.

**Fields**

| Field        | Type               | Description                                       |
| ------------ | ------------------ | ------------------------------------------------- |
| `id`         | `string`           | Auto-generated nanoid.                            |
| `triggers`   | `AbilityTriggers`  | When to fire. Default: `["cycle_complete"]`.      |
| `conditions` | `ConditionLines`   | Condition list.                                   |
| `actions`    | `BehaviorAction[]` | Actions to execute (minimum 1).                   |

### Notifications

Defines notification rules displayed to the player as guidance modals.

```ts
type NotificationAbilityConfig = NotificationAbilityRule[];
```

Each rule extends `ModalGuidanceContentSchema` with an auto-generated `id`.

### ConditionalActivation

Conditionally activates or deactivates other abilities based on structured conditions.

**Entry shape**

| Field                 | Type                           | Description                                         |
| --------------------- | ------------------------------ | --------------------------------------------------- |
| `priority`            | `number`                       | Evaluation order. Default: `0`.                     |
| `conditions`          | `StructuredCondition[]`        | Conditions that must pass for targets to be active. |
| `targets`             | `ConditionalActivationTarget[]`| Abilities to toggle.                                |
| `inactiveExplanation` | `string`                       | UI message shown when ability is inactive.          |

**ConditionalActivationTarget**

| Field      | Type     | Description                                         |
| ---------- | -------- | --------------------------------------------------- |
| `ability`  | `string` | Ability key to toggle (e.g. `"cycle"`, `"production"`). |
| `targetId` | `string` | Optional — targets a specific repeatable entry by id. |

Can be a single entry or an array of entries.

### UnifiedBlueprints

Declares this blueprint as a member of a unified cohort. Cohort members are spawned and managed together.

```ts
type UnifiedBlueprintsAbilityConfig = UnifiedBlueprintMembership[];
```

**UnifiedBlueprintMembership**

| Field                 | Type      | Description                                       |
| --------------------- | --------- | ------------------------------------------------- |
| `tag`                 | `string`  | Tag identifying the cohort.                       |
| `spawnWhenPeerSpawns` | `boolean` | Auto-spawn when another cohort member spawns.     |

## Validation rules

- Duplicate `storage`, `production`, or `upkeep` entries for the same resource are errors.
- `Cycle` plus `conversion` that resets cycle is an error (both write `state.cycle`).
- `production`, `spawner`, and `sampler` require a `cycle` ability (when triggered by cycle).
- `spawner` warns if the target blueprint id does not exist.
- Duplicate sampler targets are errors.
- Sampler targets must not collide with existing state keys or reserved keys (`cycle`, `physics`, `display`).

## Common patterns

**Basic producer**

- `cycle`: `maxProgress: { base: 100 }`, `inputs.body: { base: 10 }`
- `production`: `resource: "wood"`, `amount: { base: 1 }`, `target: "tag:storage:wood"`

**Processor**

- Storage inputs and outputs
- Cycle with inputs
- Conversion consuming inputs and emitting outputs

**Living worker**

- Hidden food storage
- Upkeep consuming food with `autoRequest: true` and `failureTrait: "malnourished"`
- Cycle for labor

**Spawner**

- Cycle plus spawner with `mode: "spawn_body"` and `target: "sys_world"`

**Sampler**

- Cycle plus sampler with `source: "sys_world.state.notoriety.value"`

**Escalating cost**

- Cycle with `resourceCosts` and `costMultPerCycle > 0`

**Conditional feature unlock**

- ConditionalActivation with structured conditions gating a production or cycle ability
