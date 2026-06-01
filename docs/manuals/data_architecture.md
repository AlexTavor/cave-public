# Cave Engine Data Architecture

Philosophies, patterns, and rules for authoring Cave Engine content. Verified against the linker (`src/engine/linker/`), the compiler (`src/engine/compiler/`), and the runtime systems (`src/engine/runtime/` and `src/game/systems/`).

## 1. The Compiler Contract (Abilities → Components)

The engine distinguishes **high-level intent** (abilities) from **low-level execution** (components).

### 1.1 Source of truth

- **Abilities** (`_editor.abilities`) are authoritative.
- **Components** (`state`, `behavior`, `powerSink`, …) are generated targets.

**Rule:** Never hand-edit a component that an ability manages. The per-blueprint compiler regenerates it during linking.

### 1.2 Ownership map

| Ability             | Compiled targets                                                |
| ------------------- | --------------------------------------------------------------- |
| `cycle`             | `state.cycle`, `state.cycle_active`, `powerSink`, accumulation rules |
| `storage`           | `state.<resource>`, `passiveEffects` (entropy), tags            |
| `production`        | `TRANSFER` rules                                                |
| `conversion`        | Conversion rules                                                |
| `upkeep`            | Demand state, passive decay, `ADD_TRAIT`/`REMOVE_TRAIT` rules, `susceptible_to_*` tag |
| `injection`         | `components.buffs`                                              |
| `assignment`        | `components.assignment`, completion-result rules                |
| `spawner`           | `SPAWN`/`SPAWN_BODY` rules                                      |
| `sampler`           | State-mirror rules                                              |
| `body`              | `components.body`                                               |
| `passport`          | `components.display` identity, blueprint label                  |
| `worldPresence`     | `components.spatial`, radius references                         |
| `draft`             | `TRIGGER_DRAFT` rule                                            |
| `updater`           | `MUTATE` rule                                                   |
| `triggeredActions`  | Arbitrary action rules                                          |

**Project config ownership**

| Config key                | Owned system                                  |
| ------------------------- | --------------------------------------------- |
| `config.traits`           | Global trait registry (`TraitSystem`)         |
| `config.habiti`           | Global habitus registry (`BodySystem`)        |
| `config.understanding`    | Global understanding registry                 |
| `config.settings.world`   | Singleton overrides for `sys_world`           |
| `config.settings.body`    | Habitus generation rules                       |
| `config.settings.carrier` | Carrier settings                              |
| `config.settings.contention` | Resource contention rules                  |

### 1.3 Scalable values

Many ability fields scale with population (`src/engine/compiler/utils/scalableCompiler.ts`):

```
multPerBody === 0 :  FinalValue = base + perBody * population
multPerBody !== 0 :  FinalValue = (base + perBody * population) * (multPerBody * population)
```

`population` is the total world body count. There is no implicit `1 +` on the multiplier.

### 1.4 The Save / Link / Load pipeline

The names matter — the runtime-facing stage is **Link**, not "Compile". "Compile" is a per-blueprint sub-step that runs *inside* linking.

1. **Edit** — Designer Mode edits land in the in-memory blueprint, including its `_editor.abilities` draft.
2. **Save** (`project-save-blueprint <fq_id>`) — serializes one blueprint (strips same-namespace id prefixes and `_computed` keys; keeps `_editor`), validates it across all modules via the Gatekeeper, writes the `.bp` semantic file to the VFS, and bumps the project version.
3. **Link** (`ModuleLinker.linkProject`, triggered by `project-load` / `project-create` / module reload) — reads `manifest.json`, validates each semantic fragment (`.cave` / `.draft` / `.art` / `.bp`), merges them into an in-memory runtime cartridge, then runs `CompilerService.compile` per blueprint.
4. **Runtime load** (`runtime.reload`, or automatically on `project-load`) — adapts the linked cartridge and calls `runtime.loadCartridge(...)`.

Validate behavior after **Link**, not only after local form edits. There is no separate persisted "compiled cartridge" file; the linked cartridge is an in-memory object handed to the runtime.

> To start a session, use a `.cvs` script (run via `run` or `game.rebirth`) that does `game.reset` → `project-load <manifest>` → `game.spawn <body>` → `tick.run`. Commands like `game.new`, `game.init`, and `set_global` do not exist.

---

## 2. The Economic Model (Need-Initiated Transfers)

Resource movement is **need-initiated**: an entity that needs a resource enqueues a `TRANSFER` (internally `TRANSFER_ASSETS`) command naming the **source** (the storage provider) and the **target** (itself). The transfer handler then debits the source and credits the target — mechanically a source→target move, initiated by the consumer's need. There is no separate "request/pull queue".

### 2.1 Entity autonomy

Entities satisfy their own needs by emitting transfers that pull from a storage provider (often `sys_world` or a tagged storage). The provider does not push to consumers.

### 2.2 Contention resolution

When a source is scarce, ordering is deterministic and data-driven (`src/engine/runtime/contention/ContentionResolver.ts`).

- Competing transfers are grouped by `targetId:resource`.
- The rule for a group is looked up on the request **target** (its `config.settings.contention`).
- Within a group, requests are sorted by reading `sortBy` off each competing **source** entity, in the rule's `direction`.

```json
"contention": [
    { "resource": "food", "sortBy": "body.xp", "direction": "DESC" }
]
```

- `direction` is `ASC | DESC` (default `DESC`).
- `sortBy` is a **free-form dot-path** read generically off the source (e.g. `body.xp`). Missing/non-numeric paths resolve to `0`; booleans coerce to `1`/`0`. There is no fixed enum of valid `sortBy` values.

The resolver only **orders** transfers. Transfers then execute in order; when the source runs dry, later (lower-priority) transfers fail or are clamped downstream.

### 2.3 Immediate vs. simulated transfers

`TRANSFER` supports `isImmediate: true`. By default a transfer spawns a physically-simulated "packet" entity that flies to the target via the impulse engine, crediting the target on arrival. With `isImmediate: true` the credit is applied synchronously in the same tick, skipping the in-flight simulation.

---

## 3. The Power Grid

Cycle progress is coupled to a global attribute grid. There is **no `powerSource` component** — the term does not exist in the schema.

### 3.1 Supply

Global supply lives on the `sys_world` entity's state keys: `power_body`, `power_mind`, `power_social`.

### 3.2 Demand

Each consumer carries a `powerSink` (`baseDemand`, `maxDemand`, `throttle`, `efficiency`, `drawFraction`, `allocatedDraw`, `showThrottleSlider`, `status`). A `cycle` ability compiles a `powerSink` whose demand comes from `inputs.body/mind/social`.

### 3.3 Distribution

`EnergyDistributionSystem` (in `src/game/systems/`) runs each tick:

1. Gathers world supply and every entity with a `powerSink`.
2. Divides finite supply across competing sinks.
3. Per sink, computes `efficiency = provided / unthrottledBase`, derives `status`, and writes `allocatedDraw`.

**Status** is derived from efficiency: `efficiency ≥ 0.99` → `nominal`; `efficiency ≤ 0.01` → `blackout`; otherwise `brownout` (the `powerSink.status` default before the system runs is `blackout`).

### 3.4 Coupling to cycles

The cycle compiler writes accumulation expressions that reference `self.powerSink.allocatedDraw.<attr>` (alongside base/max demand). So a cycle's progress per tick scales with the power the energy system allocated to its sink — that is the literal grid coupling.

---

## 4. The Vitality Loop (Data-Driven Survival)

Survival mechanics (hunger, damage, cold) are authored in data, not hardcoded.

### 4.1 Upkeep triggers the need

```json
{ "resource": "food", "autoRequest": true, "failureTrait": "starving" }
```

If the entity cannot satisfy its upkeep demand, the `starving` trait is toggled on (via `ADD_TRAIT`/`REMOVE_TRAIT` rules the upkeep compiler emits).

### 4.2 Traits carry the consequence

Define `starving` in `config.traits` with `modifiers` and/or `cycles` that apply damage, reduce output, etc. `TraitSystem` (in `src/game/systems/`) resolves trait instances against the registry every tick.

---

## 5. Trait Architecture

Traits are modular definition blocks that modify entities at runtime (`config.traits`).

### 5.1 Composition

- **`modifiers`** — `PassiveEffect[]`, applied **every tick** (always-on).
- **`cycles`** — periodic `PassiveEffect[]` ticks gated by `periodSeconds`, with per-trait accumulators.
- **`rules`** — optional behavior rules.

### 5.2 Application

- Trait **instances** live on the entity in `components.traits`: `{ id, remainingSeconds?, cycles? }`.
- `TraitSystem` resolves instances against `config.traits`: modifiers each tick, cycles on interval, and expiry via `remainingSeconds`.
- Mutate at runtime with `ADD_TRAIT` / `REMOVE_TRAIT`, or automatically via an `upkeep` ability's `failureTrait`.

---

## 6. Habitus and Understanding Architecture

Permanent progression elements applied to body entities.

### 6.1 Habiti

Identity-level traits with permanent effects (`config.habiti`).

- Types: `species`, `gender`, `social_category`, `profession`, `sexual_preference`, `unique_body`.
- Bodies can carry multiple habiti, subject to `excludes`.
- Generation is governed by `config.settings.body` (weighted pools per type).
- Granted at runtime via `GAIN_HABITI`.

**Habitus effect types** (exactly five): `add_cave_attribute`, `add_absorption_xp_conversion`, `add_resource_gain_multiplier`, `add_producer_output_multiplier`, `increase_max_purge`.

### 6.2 Understanding

Knowledge unlocks with permanent effects (`config.understanding`). They **reuse the habitus effect schema**. Granted via `GAIN_UNDERSTANDING`.

---

## 7. Tagging and Targeting Strategy

Tags are the primary addressing system for indirect interactions.

### 7.1 Tag taxonomy

| Category   | Examples                              | Meaning          |
| ---------- | ------------------------------------- | ---------------- |
| Identity   | `worker`, `guard`, `queen`            | Who I am         |
| Capability | `storage:wood`, `producer:heat`       | What I do        |
| Status     | `susceptible_to_starving`, `depleted` | My current state |

### 7.2 Tag-based targeting

- `TRANSFER` and `DISPATCH` accept `tag:<tag>` as a target.
- `injection` targets entities by tag for passive-effect delivery.
- `storage` with `isDefault: true` adds a `storage:<resource>` tag.
- `upkeep` adds a `susceptible_to_<failureTrait>` tag.

### 7.3 Limitation

Injections target tags, not state. You cannot inject based on a dynamic value (like health) unless that value is mirrored to a tag, which is expensive. Workaround: inject a universal rule that checks the recipient's own state.

---

## 8. Logic and Syntax

The logic language governs decision-making in behavior rules.

### 8.1 Token structure

A condition is a list of tokens, each `{ t, v }`: `t` ∈ `keyword | ref | op | val`. Keyword values are `IF | AND | OR | NOT`. (See the [DSL Manual](dsl_manual.md#behavior-logic).)

### 8.2 Namespaces

- `self.*` — the executing entity.
- `global.*` / `globals.*` — system globals.
- `sys_*` and any other id — a named entity in the snapshot (e.g. `sys_world`).

### 8.3 Action types summary

| Category    | Actions                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| Mutation    | `MUTATE` (`SET`, `ADD`, `SUB`)                                            |
| Lifecycle   | `SPAWN`, `SPAWN_BODY`, `KILL`, `KILL_ALL_BODIES_EXCEPT`, `SPAWN_CARRIER`  |
| Logistics   | `TRANSFER`, `DISPATCH`                                                    |
| Traits      | `ADD_TRAIT`, `REMOVE_TRAIT`                                               |
| Progression | `GAIN_HABITI`, `GAIN_UNDERSTANDING`                                       |
| Meta        | `TRIGGER_DRAFT`, `PATCH_BLUEPRINT`, `SHOW_NOTIFICATION_ABILITY_GUIDANCE`, `SHOW_CINEMATIC` |

---

## 9. Conditional Activation

The `conditionalActivation` ability gates entire ability slots on runtime conditions — enable production above a threshold, disable upkeep during dormancy, etc. Conditions use the `StructuredCondition` schema (named conditions from `config.settings.conditions`, plus built-in kinds). `priority` controls evaluation order. The entry may be a single object or an array.

---

## 10. Unified Blueprints

The `unifiedBlueprints` ability declares a blueprint as a cohort member. Cohort members share a tag and can be managed (spawned, killed) together. `spawnWhenPeerSpawns: true` auto-spawns the member when any peer in the cohort spawns. Use this for multi-part entities that should always exist together.

---

## 11. Runtime Systems (tick order)

The runtime is a generic ECS host. Tick order is defined in `src/engine/runtime/runtimeSystemPhase.ts`; the game registers its systems in `src/game/main.ts`. Per tick (when not paused):

1. **Pre-behavior systems** (registration order) — e.g. `CensusSystem`, `PassiveEffectsSystem`.
2. **BehaviorSystem** — evaluates each entity's behavior rules and dispatches their actions.
3. **AutomationSystem** — drives scheduled events.
4. **Registered systems** (registration order) — including `FactsSystem`, `TraitSystem`, `CaveSystem`, `BodySystem`, assignment systems, `AttributePoolSystem`, `PowerAssignmentSystem`, `EnergyDistributionSystem`, `ProcessingNodeSystem`, carrier systems, `DynamicPhysicsSystem`, `DraftSystem`, `PurgeNarrativeSystem`.

While paused, only systems flagged `runsWhenPaused` run; pre-behavior, behavior, and automation are skipped. Note that only three generic systems live under `src/engine/runtime/systems/` (`BehaviorSystem`, `AutomationSystem`, `GlobalEffectsIndexer`); all gameplay systems live under `src/game/systems/`.
