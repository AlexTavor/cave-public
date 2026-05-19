# Cave Engine Data Architecture

This document defines the philosophies, patterns, and rules for authoring content in Cave Engine.

## 1. The Compiler Contract (HLL → LLL)

The engine distinguishes between **High-Level Intent** (Abilities) and **Low-Level Execution** (Components).

### 1.1 Source of truth

- **Abilities** (`_editor.abilities`) are the HLL source of truth.
- **Components** (`state`, `behavior`, `powerSink`, etc.) are LLL compilation targets.

**Rule:** Never manually edit a component that an ability manages. The compiler runs on every save and overwrites manual changes.

### 1.2 Ownership map

| HLL ability         | Compiled LLL targets                                    |
| ------------------- | ------------------------------------------------------- |
| `cycle`             | `state.cycle`, `state.cycle_active`, `powerSink`, accumulation rules |
| `storage`           | `state.<resource>`, `passiveEffects` (entropy), tags   |
| `production`        | Transfer rules                                          |
| `conversion`        | Conversion rules                                        |
| `upkeep`            | Demand state, passive decay, trait toggle rules         |
| `injection`         | `buffs`                                                 |
| `assignment`        | `assignment`, `state.processing_outputs`                |
| `spawner`           | Spawn rules                                             |
| `sampler`           | State mirror rules                                      |
| `body`              | `components.body`                                       |
| `passport`          | `components.display` identity, blueprint label          |
| `worldPresence`     | `components.spatial`, radius references                 |
| `draft`             | `TRIGGER_DRAFT` rule                                    |
| `updater`           | `MUTATE` rule                                           |
| `triggeredActions`  | Arbitrary action rules                                  |

**Project config ownership**

| Config key      | Owned system                                          |
| --------------- | ----------------------------------------------------- |
| `config.traits` | Global trait registry (TraitSystem)                   |
| `config.habiti` | Global habitus definition registry                    |
| `config.understanding` | Global understanding registry                  |
| `config.settings.world` | Singleton overrides for `sys_world`            |
| `config.settings.body`  | Habitus type rules for body generation         |
| `config.settings.carrier` | Carrier entity settings                      |

### 1.3 Scalable values

Many ability fields support population scaling.

```
FinalValue = (base + perBody * population) * (1 + multPerBody * population)
```

`population` is the total world body count.

### 1.4 The compilation pipeline

1. Designer Mode edits `_editor.abilities`.
2. `Save` flushes editor draft into the semantic project file.
3. `Compile` links the active project manifest into the runtime cartridge.
4. Runtime reloads from the compiled cartridge.

Validate behavior after **Compile**, not only after local form edits.

---

## 2. The Economic Model (Pull Architecture)

Resources move based on **Need** (Pull), not Push.

### 2.1 Entity autonomy

Entities satisfy their own needs by issuing `TRANSFER` commands targeting a storage provider. The World does not push resources to workers; workers pull from the World.

### 2.2 Contention resolution

When resources are scarce, distribution is deterministic and data-driven.

- The **source entity** (`sys_world`) defines distribution policy via `config.settings.contention`.
- Contention rules sort all incoming requests for a tick by a specified attribute and direction.
- High-priority entities succeed; low-priority entities fail when the source runs dry.

```json
"contention": [
    { "resource": "food", "sortBy": "body.xp", "direction": "DESC" }
]
```

### 2.3 Immediate vs. queued transfers

The `TRANSFER` action supports `isImmediate: true` for transfers that bypass the standard queued tick cycle.

---

## 3. The Vitality Loop (Data-Driven Survival)

Survival mechanics (hunger, damage, cold) are implemented purely in data, not in hardcoded systems.

### 3.1 Upkeep triggers the need

Configure an `upkeep` ability:

```json
{ "resource": "food", "autoRequest": true, "failureTrait": "starving" }
```

If the entity cannot satisfy its upkeep demand, the `starving` trait is toggled on.

### 3.2 Traits carry the consequence

Define `starving` in `config.traits` with modifiers or cycles that apply damage, reduce output, etc. The `TraitSystem` resolves trait instances against the global registry every tick.

---

## 4. Trait Architecture

Traits are modular definition blocks that modify entities at runtime.

### 4.1 Composition

A `TraitDefinition` (in `config.traits`) has:

- **`modifiers`** — `PassiveEffect[]` always-on operations applied to target paths.
- **`cycles`** — Periodic `PassiveEffect[]` ticks with per-trait accumulators (`periodSeconds`).
- **`rules`** — Optional behavior rule payloads for tooling/runtime features.

### 4.2 Application

- Trait instances are stored entity-level in `components.traits`: `{ id, remainingSeconds?, cycles? }`.
- The `TraitSystem` resolves instances against `config.traits` definitions.
- Use behavior actions `ADD_TRAIT` / `REMOVE_TRAIT` for runtime mutation.
- Use the `upkeep` ability's `failureTrait` field for automatic toggling.

---

## 5. Habitus and Understanding Architecture

Habiti and understandings are permanent progression elements applied to body entities.

### 5.1 Habiti

Habiti are identity-level traits with permanent effects (defined in `config.habiti`).

- Types: `species`, `gender`, `social_category`, `profession`, `sexual_preference`, `unique_body`.
- Bodies can carry multiple habiti, subject to `excludes` rules.
- Body generation is governed by `config.settings.body.habitusTypeRules` — weighted pools per type with probability and max count.
- Granted at runtime via the `GAIN_HABITI` action.

**Habitus effect types:** `add_cave_attribute`, `add_absorption_xp_conversion`, `add_resource_gain_multiplier`, `add_producer_output_multiplier`, `increase_max_purge`.

### 5.2 Understanding

Understandings are knowledge unlocks with permanent effects (defined in `config.understanding`).

- Share the same effect schema as habiti.
- Granted via the `GAIN_UNDERSTANDING` action.

---

## 6. Tagging and Targeting Strategy

Tags are the primary addressing system for indirect interactions.

### 6.1 Tag taxonomy

| Category   | Examples                               | Meaning            |
| ---------- | -------------------------------------- | ------------------ |
| Identity   | `worker`, `guard`, `queen`             | Who I am           |
| Capability | `storage:wood`, `producer:heat`        | What I do          |
| Status     | `susceptible_to_starving`, `depleted`  | My current state   |

### 6.2 Tag-based targeting

- `TRANSFER` and `DISPATCH` actions accept `tag:<tag>` as a target.
- `injection` ability targets entities by tag for passive effect delivery.
- `storage` ability with `isDefault: true` adds `storage:<resource>` tag automatically.
- `upkeep` ability adds `susceptible_to_<failureTrait>` tag automatically.

### 6.3 Limitation

Injections target tags, not state. You cannot inject based on a dynamic value (like health) unless that value is mirrored to a tag, which is expensive. Workaround: inject a universal rule that checks its own state.

---

## 7. Logic and Syntax

The scripting language (Logic) governs decision-making in behavior rules.

### 7.1 Token structure

- **REF** — data path (`self.state.xp.value`, `global.season_intensity`, `sys_vitality.state.damage.value`)
- **OP** — operator (`>`, `EQ`, `AND`, `NOT`)
- **VAL** — numeric literal

### 7.2 Namespaces

- `self.*` — the executing entity
- `global.*` — system globals
- `sys_*` — named singleton entities (e.g. `sys_world`, `sys_vitality`)
- Any other id — resolves to a named entity in the snapshot

### 7.3 Action types summary

| Category    | Actions                                                         |
| ----------- | --------------------------------------------------------------- |
| Mutation    | `MUTATE` (`SET`, `ADD`, `SUB`)                                  |
| Lifecycle   | `SPAWN`, `SPAWN_BODY`, `KILL`, `KILL_ALL_BODIES_EXCEPT`, `SPAWN_CARRIER` |
| Logistics   | `TRANSFER`, `DISPATCH`                                          |
| Traits      | `ADD_TRAIT`, `REMOVE_TRAIT`                                     |
| Progression | `GAIN_HABITI`, `GAIN_UNDERSTANDING`                             |
| Meta        | `TRIGGER_DRAFT`, `PATCH_BLUEPRINT`, `SHOW_NOTIFICATION_ABILITY_GUIDANCE`, `SHOW_CINEMATIC` |

---

## 8. Conditional Activation

The `conditionalActivation` ability gates entire ability slots on runtime conditions. Use it to:

- Enable production only when a resource threshold is met.
- Disable an upkeep during a dormancy phase.
- Present different behavior trees depending on game state.

Conditions are evaluated using the `StructuredCondition` schema (named conditions from `config.settings.conditions`). Priority controls evaluation order when multiple entries exist.

---

## 9. Unified Blueprints

The `unifiedBlueprints` ability declares that a blueprint is part of a cohort. All cohort members share a tag and can be managed (spawned, killed) together. `spawnWhenPeerSpawns: true` causes auto-spawning when any peer in the cohort is spawned.

Use this for multi-part entities (e.g. a body and its companion) that should always exist together.

---

## 10. Editor Save/Compile Runtime Flow

1. **Save** — flushes editor draft state into semantic project files.
2. **Compile** — links active project manifest into runtime cartridge output.
3. **Runtime reload** — simulation reloads from compiled cartridge.
4. **`game.init <body_blueprint_id> [auto_run=false]`** — spawns configured Faces, then the body. Optional `auto_run=true` starts simulation immediately.
