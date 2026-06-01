# Cave Engine DSL Manual

This document defines the data schema and scripting language used to author Cave Engine content. Everything here is verified against the Zod schemas under `src/data/schemas/` — field names, defaults, and enums are taken from the code, not from intent. Where a field has a default, it is stated.

## Core architecture

- A **module** is the unit of content. On disk, content is split across **semantic source files** (one concern per file). At runtime, the linker merges them into a single in-memory cartridge.
- **Blueprints** define component data; runtime entities are instances of blueprints.
- State is reactive. Mutations drive visuals and behavior.
- A blueprint's `_editor.abilities` block is the **high-level source of truth**. The per-blueprint compiler translates abilities into low-level components (`state`, `behavior`, `powerSink`, `passiveEffects`, `assignment`, `buffs`, …) during linking. Do not hand-edit a component that an ability manages — it is regenerated. See the [Abilities Manual](hll_manual.md).

## Semantic source files

A project is a manifest plus a set of semantic files. The manifest (`manifest.json`) is `{ name, version, files: string[] }`. Each listed file is parsed and validated by its extension (`src/engine/linker/semanticParser.ts`):

| Extension | Holds                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| `.bp`     | Blueprints — a JSON object `{ [blueprintId]: Blueprint }`.                                                     |
| `.cave`   | Config — `impulse`, `game_config`, `conditions`, `guidances`, `tutorials`, `knowledge`, `body`, `carrier`, `world`, `traits`, `habiti`, `understanding`. |
| `.draft`  | `{ draftOptions, draftPools }`.                                                                                |
| `.art`    | Assets — `{ displays, glyphs, styles, settings }`.                                                             |
| `.cvs`    | A Cave script (plain text), executed line-by-line by the `run` command. Not a linker input.                   |

Individual `.bp` files are JSON. The example project lives in `src/data/raw/example/` (`manifest.json` + `modules/`).

## Module cartridge (logical shape)

The merged, validated cartridge (`ModuleSchema`, `src/data/schemas/module.ts`) has these top-level keys:

| Key            | Type                                       | Required | Notes                                              |
| -------------- | ------------------------------------------ | -------- | -------------------------------------------------- |
| `metadata`     | `ModuleMetadata`                           | yes      |                                                    |
| `blueprints`   | `Record<string, Blueprint>`                | yes      | Keyed by id, **not** an array.                     |
| `assets`       | `AssetCollection`                          | yes (defaulted) | `{ displays, glyphs, styles, settings }`.   |
| `draftOptions` | `Record<string, DraftOptionBlueprint>`     | no       | Keyed by id.                                       |
| `draftPools`   | `Record<string, DraftPoolBlueprint>`       | no       | Keyed by id.                                       |
| `scripts`      | `Record<string, string>`                   | no       | Named scripts.                                     |
| `config`       | `BlueprintConfig`                          | no (defaulted) | Traits, habiti, understanding, settings.     |

The schema runs a legacy migration first: an old top-level `blueprint` key and `assets.traits` / `assets.settings` are moved into `config`. New content should not rely on it.

**`metadata`** (`module.ts`): `id` (required), `name` (required), `version` (string, default `"0.0.1"`), `author?`, `description?`.

## Project config

`config` (`src/data/schemas/blueprintConfig.ts`) — every key is defaulted, so `config` itself is optional:

| Key             | Type                                        | Description                       |
| --------------- | ------------------------------------------- | --------------------------------- |
| `traits`        | `Record<string, TraitDefinition>`           | Global trait registry.            |
| `habiti`        | `Record<string, HabitusDefinition>`         | Global habitus registry.          |
| `understanding` | `Record<string, UnderstandingDefinition>`   | Global understanding registry.    |
| `settings`      | `BlueprintSettings`                         | Physics, game config, etc.        |

**`config.settings`** keys: `impulse` (physics), `game_config`, `conditions?`, `guidances?`, `tutorials?`, `knowledge?`, `contention?`, `body?` (habitus generation rules), `carrier?`, `world?` (singleton overrides for `sys_world`).

> Note: `traits`, `habiti`, and `understanding` live **under `config`**, not at the cartridge root.

**Contention rule** (`config.settings.contention`):

```json
"contention": [
    { "resource": "food", "sortBy": "body.xp", "direction": "DESC" }
]
```

`direction` is `ASC | DESC` (default `DESC`). `sortBy` is a free-form dot-path read off each competing **source** entity. See [Data Architecture §2.2](data_architecture.md#22-contention-resolution) — the rule is looked up on the request **target**, the sort value is read from each **source**.

## Blueprint structure

`src/data/schemas/blueprint.ts`:

| Field        | Type       | Default | Description                              |
| ------------ | ---------- | ------- | ---------------------------------------- |
| `id`         | `string`   | —       | Required.                                |
| `label`      | `string`   | `""`    | Display label.                           |
| `tags`       | `string[]` | `[]`    | Tags for matching and lookup.            |
| `components` | `object`   | —       | Required. Component data (see below).    |
| `_editor`    | `object`   | —       | Optional. `{ abilities }` — HLL source.  |

## Component reference

The `components` object accepts exactly these keys: `display`, `state`, `assignment`, `behavior`, `narrative`, `physics`, `body`, `cave`, `powerSink`, `passiveEffects`, `buffs`, `spatial`, `traits`, `run`, `permanent`, `thought`, `habitiAnnouncement`, `parent`.

> There is **no `automation` component** and **no `powerSource` component**. (An `AutomationComponentSchema` exists in the codebase but is not wired into blueprints.)

### display

`src/data/schemas/components/display.ts`.

```json
"display": {
    "label": "Wood Storage",
    "display_key": "woodstorage",
    "glyphKey": "wood",
    "description": "Stores wood.",
    "style": "woodstorage",
    "radius": { "min": 20, "max": 80, "valueRef": "self.state.wood.value", "maxRef": "self.state.wood.max" },
    "bars": [ { "key": "state.wood", "maxKey": "state.wood.max", "color": "#4caf50", "label": "Wood" } ]
}
```

| Field         | Type     | Default | Notes                                  |
| ------------- | -------- | ------- | -------------------------------------- |
| `label`       | `string` | —       | Required.                              |
| `display_key` | `string` | —       | Required.                              |
| `glyphKey`    | `string` | —       | Optional.                              |
| `description` | `string` | —       | Optional.                              |
| `style`       | `string` | —       | Optional. References `assets.styles`.  |
| `radius`      | object   | —       | `{ min (10), max (20), valueRef?, maxRef? }`. |
| `bars`        | `StatusLabel[]` | — | Optional UI bars.                      |

A `bars` entry is `{ key, max?, maxKey?, color?, label?, position?, paletteColorKey?, spanRatio? }` and **must** supply either `max` or `maxKey`.

### state

A record of named entries (`src/data/schemas/components/state.ts`).

```json
"state": {
    "wood": { "value": 0, "max": 100, "visible": true, "allowDeposit": true },
    "is_active": { "value": 1, "visible": false }
}
```

State entry shape:

| Field                       | Type        | Default | Description                          |
| --------------------------- | ----------- | ------- | ------------------------------------ |
| `value`                     | `GameValue` | —       | Required.                            |
| `max`                       | `GameValue` | —       | Optional.                            |
| `min`                       | `GameValue` | —       | Optional.                            |
| `visible`                   | `boolean`   | `false` | Show in UI.                          |
| `allowDeposit`              | `boolean`   | —       | Allow external transfers in.         |
| `allowWithdraw`             | `boolean`   | —       | Allow external transfers out.        |
| `priority`                  | `number`    | —       | Pull/contention priority.            |
| `scaleOnMaxChange`          | `boolean`   | —       | Scale value when max changes.        |
| `preserveValueOnMaxDecrease`| `boolean`   | —       | Keep value when max drops.           |

**GameValue** (`src/data/schemas/primitives.ts`) is one of:
- a `number`
- a `boolean`
- a logic-sentence `string` (e.g. `"self.state.xp.value"`)
- an array of **ValueNode**: `{ ref?: string, value?: number, op }`, where `op` is `SET | ADD | SUB | MULT | DIV` (default `ADD`).

### behavior

`{ rules: BehaviorRule[] }` (default `[]`). Rules are evaluated each tick. See [Behavior logic](#behavior-logic).

### assignment

A station that accepts assigned bodies (`src/data/schemas/assignment.ts`).

```json
"assignment": { "slots": 5, "locking": true, "filter": [], "minimums": [], "assignedIds": [] }
```

| Field         | Type     | Default | Notes                            |
| ------------- | -------- | ------- | -------------------------------- |
| `slots`       | `number` | —       | Required.                        |
| `locking`     | `boolean`| `true`  | Prevents automatic recall.       |
| `filter`      | `Rule[]` | `[]`    | Assignment filter conditions.    |
| `minimums`    | `Rule[]` | `[]`    | Minimum-attribute rules.         |
| `assignedIds` | `string[]`| `[]`   | Currently assigned entity ids.   |

### passiveEffects

A **bare array** (default `[]`) of always-on effects applied each tick.

```json
"passiveEffects": [
    { "op": "SET", "target": "self.state.cost.value", "source": "global.population" }
]
```

Each effect: `{ op, target, source?, value? }`. `op` is `SET | ADD | SUB | MULT | DIV`.

### buffs

Applies tagged passive effects to other entities. Note the doubly-nested shape.

```json
"buffs": {
    "buffs": [
        { "targetTag": "producer", "effects": [ { "op": "ADD", "target": "self.state.cycle.max", "value": 5 } ] }
    ]
}
```

### powerSink

Connects the entity to the global attribute grid (`src/data/schemas/components/powerSink.ts`).

```json
"powerSink": {
    "baseDemand": { "body": 10, "mind": 0, "social": 0 },
    "throttle": 1,
    "efficiency": 0,
    "drawFraction": {},
    "status": "blackout"
}
```

| Field              | Type        | Default     | Notes                                       |
| ------------------ | ----------- | ----------- | ------------------------------------------- |
| `baseDemand`       | AttributeSet| all `0`     | `{ body, mind, social }`.                   |
| `maxDemand`        | AttributeSet| = baseDemand| Filled from `baseDemand` if omitted.        |
| `throttle`         | `number`    | `1`         | 0–1.                                        |
| `efficiency`       | `number`    | `0`         | Set by the energy system at runtime.        |
| `drawFraction`     | `Record<string, number>` | `{}` | Set at runtime.                          |
| `allocatedDraw`    | AttributeSet| all `0`     | Set by the energy system at runtime.        |
| `showThrottleSlider`| `boolean`  | `true`      | Show throttle slider in UI.                 |
| `status`           | enum        | `"blackout"`| `nominal \| brownout \| blackout`.          |

There is no `powerSource`. Power **supply** lives on `sys_world` state keys (`power_body`, `power_mind`, `power_social`) and is distributed by the energy system. See [Data Architecture §3](data_architecture.md#3-the-power-grid).

### physics

`src/data/schemas/physicsComponent.ts`: `{ mass (≥0.1), radius (≥1), drag (0–1), isStatic (default false), x, y, anchor? }`.

### spatial

Spatial placement and render-radius binding (`src/data/schemas/v2/spatial.ts`). Preferred over hand-editing `physics`/`display`.

```json
"spatial": { "x": 500, "y": 500, "radius": { "min": 20, "max": 60, "valueRef": "self.state.food.value", "maxRef": "self.state.food.max" } }
```

Defaults: `x` `0`, `y` `0`, `radius.min` `10`, `radius.max` `20`.

### body

RPG/biological stats (`src/data/schemas/game/body.ts`).

| Field             | Type        | Default       | Notes                              |
| ----------------- | ----------- | ------------- | ---------------------------------- |
| `xp`              | `number`    | —             |                                    |
| `xpRate`          | `number`    | —             |                                    |
| `level`           | `number`    | —             |                                    |
| `baseAttributes`  | AttributeSet| —             | `{ body, mind, social }`.          |
| `attributes`      | AttributeSet| —             | Resolved attributes.               |
| `passport`        | object      | —             | Identity metadata.                 |
| `traits`          | `string[]`  | —             | Trait ids.                         |
| `habiti`          | `string[]`  | —             | Habitus ids.                       |
| `health`          | `number`    | `100`         |                                    |
| `maxHealth`       | `number`    | `100`         |                                    |
| `assignmentId`    | `string`    | `"sys_world"` | Current station.                   |
| `assignmentStatus`| enum        | `"orbiting"`  | `navigating \| orbiting`.          |

### traits

Runtime trait **instances** on an entity (an array; distinct from `config.traits` definitions).

```json
"traits": [ { "id": "hungry" }, { "id": "regen", "remainingSeconds": 10 } ]
```

| Field              | Type                                     | Notes                                |
| ------------------ | ---------------------------------------- | ------------------------------------ |
| `id`               | `string`                                 | Trait definition id from `config.traits`. |
| `remainingSeconds` | `number`                                 | Optional duration timer.             |
| `cycles`           | `Record<string, { accumulatorSeconds }>` | Optional per-cycle accumulator state.|

### narrative

In-world narrative prompt with optional choices (`src/data/schemas/components.ts`).

```json
"narrative": {
    "title": "A Strange Visitor",
    "body": "Something emerges from the dark.",
    "priority": "modal",
    "choices": [ { "label": "Accept", "effects": [ { "op": "ADD", "target": "self.state.xp.value", "value": 100 } ] } ]
}
```

`priority` is `toast | modal | interrupt` (default `toast`).

### cave

Cave-specific display/mood/progression configuration (`src/data/schemas/game/cave.ts`). Provided for the `sys_cave` entity.

### run and permanent (facts)

Both share the `FactsComponent` shape: a nested record `Record<string, Record<string, number>>`.

- `run`: reset between runs.
- `permanent`: persisted across runs.

```json
"run": { "tutorial": { "done": 1 } },
"permanent": { "score": { "best": 42 } }
```

### thought

`{ _tag: "thought", active, thoughtId, body, rememberScope, resumeStatus }`. Used by the notification/thoughts system. `_tag` must be the literal `"thought"`.

### parent

Links a spawned entity back to its parent. Either `{ parentId: string }` or an entity target spec (`{ kind: "entity_id", entityId }` / `{ kind: "entity_tag", tag }`).

### habitiAnnouncement

Transient component used to surface newly-gained habiti in the UI.

## Behavior logic

A rule has `conditions` (all must pass) and `actions`. A `BehaviorRule` is `{ id, sortKey, conditions: LogicRule[], actions: BehaviorAction[] }` — `id` and `sortKey` are auto-generated.

**Logic token structure** (`src/data/schemas/logic.ts`). A condition is a list of tokens, each a discriminated object `{ t, v }`:

| `t`       | `v`                                  |
| --------- | ------------------------------------ |
| `keyword` | `IF \| AND \| OR \| NOT`             |
| `ref`     | a reference string                   |
| `op`      | an operator string                   |
| `val`     | a number                             |

Example condition tokens:

```json
"tokens": [
    { "t": "ref", "v": "self.state.xp.value" },
    { "t": "op",  "v": ">=" },
    { "t": "ref", "v": "self.state.threshold.value" }
]
```

**Operators** (logic comparison/arithmetic strings): `=`, `==`, `EQ`, `!=`, `NEQ`, `>`, `GT`, `<`, `LT`, `>=`, `GTE`, `<=`, `LTE`; arithmetic `+`, `ADD`, `-`, `SUB`, `*`, `MULT`, `/`, `DIV`. (Structured conditions used by abilities use a separate vocabulary — see the HLL manual.)

**Reference namespaces**
- `self.` — the executing entity.
- `global.` / `globals.` — global values.
- `sys_*` and any other id — a named entity in the snapshot (e.g. `sys_world`).

## Behavior actions

The full action set (`src/data/schemas/behaviorCoreSchemas.ts`, `behavior.ts`):

### Mutation

| Action   | Fields                  | Notes                                   |
| -------- | ----------------------- | --------------------------------------- |
| `MUTATE` | `target`, `op`, `value` | `op` is `SET`, `ADD`, or `SUB` **only**. `value` is a number or logic string. |

### Lifecycle

| Action                   | Fields                                              | Notes                                   |
| ------------------------ | --------------------------------------------------- | --------------------------------------- |
| `SPAWN`                  | `blueprintId`, `id?`, `parentId?`, `forcedHabiti?`  | Creates an entity.                      |
| `SPAWN_BODY`             | `blueprintId`, `target?`, `parentId?`, `forcedHabiti?` | Spawns a body entity.                |
| `KILL`                   | `entityId`                                          | Removes an entity.                      |
| `KILL_ALL_BODIES_EXCEPT` | `quantity`                                          | Kills bodies beyond the retained count. |
| `SPAWN_CARRIER`          | `tags[]` (≥1), `commands[]` (≥1)                    | Spawns a carrier with inline actions.   |

### Logistics

| Action     | Fields                                              | Notes              |
| ---------- | --------------------------------------------------- | ------------------ |
| `TRANSFER` | `source`, `target`, `resource`, `amount`, `isImmediate?` | Moves resources. |
| `DISPATCH` | `entity`, `target`                                  | Sends a body to a station. |

### Trait

| Action          | Fields    | Notes                                          |
| --------------- | --------- | ---------------------------------------------- |
| `ADD_TRAIT`     | `traitId` | Adds a trait instance to entity `traits`.      |
| `REMOVE_TRAIT`  | `traitId` | Removes a trait instance.                      |

### Progression

| Action               | Fields                          | Notes                                     |
| -------------------- | ------------------------------- | ----------------------------------------- |
| `GAIN_HABITI`        | `habitusId`, `entityId?`        | Grants a habitus to a body entity.        |
| `GAIN_UNDERSTANDING` | `understandingId`, `entityId?`  | Grants an understanding to a body entity. |

### Meta

| Action                              | Fields                                                       | Notes                            |
| ----------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| `TRIGGER_DRAFT`                     | `poolId`, `count?`, `label?`, `triggerEntityId?`, `onComplete?` | Opens the draft UI.          |
| `PATCH_BLUEPRINT`                   | `blueprintId`, `components`                                  | Runtime blueprint patching.      |
| `SHOW_NOTIFICATION_ABILITY_GUIDANCE`| `abilityId`, `title`, `text`, `imageUrl`                    | Shows a guidance modal.          |
| `SHOW_CINEMATIC`                    | `lines[]` (≥1)                                              | Triggers a cinematic sequence.   |

## Trait definitions

Defined in `config.traits` (`src/data/schemas/game/traits.ts`). Referenced by id from entity `traits` arrays and `ADD_TRAIT`/`REMOVE_TRAIT`.

```json
"traits": {
    "malnourished": {
        "id": "malnourished",
        "label": "Malnourished",
        "modifiers": [ { "op": "MULT", "target": "self.state.output.value", "value": 0.5 } ],
        "cycles": [ { "id": "tick_hunger", "periodSeconds": 1, "effects": [ { "op": "SUB", "target": "self.state.health.value", "value": 1 } ] } ],
        "rules": []
    }
}
```

| Field        | Type               | Notes                                  |
| ------------ | ------------------ | -------------------------------------- |
| `id`         | `string`           | Required.                              |
| `label`      | `string`           | Required.                              |
| `description`| `string`           | Optional.                              |
| `modifiers`  | `PassiveEffect[]`  | Always-on effects, applied every tick. |
| `cycles`     | `TraitCycle[]`     | Periodic effects; `periodSeconds > 0`. |
| `rules`      | `BehaviorRule[]`   | Optional behavior rules.               |

## Habitus definitions

Defined in `config.habiti` (`src/data/schemas/game/habiti.ts`). Permanent identity traits on body entities.

```json
"habiti": {
    "h_worker": {
        "id": "h_worker",
        "label": "Worker",
        "description": "A sturdy laborer.",
        "summary": "Short summary.",
        "type": "profession",
        "effects": [ { "type": "add_cave_attribute", "attribute": "body", "amount": 2, "description": "" } ],
        "excludes": []
    }
}
```

`type` is one of: `species`, `gender`, `social_category`, `profession`, `sexual_preference`, `unique_body`. `description` and `summary` default to `""`; `effects` and `excludes` default to `[]`.

**Habitus effect types** (`src/data/schemas/game/habitusEffects.ts`) — exactly five, discriminated on `type`:

| `type`                           | Additional fields                       | Description                              |
| -------------------------------- | --------------------------------------- | ---------------------------------------- |
| `add_cave_attribute`             | `attribute` (`body\|mind\|social`), `amount` | Increases a cave attribute.         |
| `add_absorption_xp_conversion`   | `amount`                                | Multiplies XP from absorption.           |
| `add_resource_gain_multiplier`   | `resource`, `amount`                    | Multiplies resource gains.               |
| `add_producer_output_multiplier` | `producerTag`, `amount`                 | Multiplies output for tagged producers.  |
| `increase_max_purge`             | `amount`                                | Increases maximum purge capacity.        |

All effects carry an optional `description` (default `""`).

## Understanding definitions

Defined in `config.understanding` (`src/data/schemas/game/understanding.ts`). Knowledge unlocks with permanent effects. Understandings **reuse the habitus effect schema**.

```json
"understanding": {
    "u_fire": {
        "id": "u_fire",
        "label": "Fire",
        "description": "Knowledge of fire.",
        "effects": [ { "type": "add_cave_attribute", "attribute": "mind", "amount": 1, "description": "" } ]
    }
}
```

## Draft configuration

`src/data/schemas/draft.ts`. Drafts present a 1-of-N choice and run the chosen option's `payload`.

```json
"draftOptions": {
    "reward_heal": {
        "id": "reward_heal",
        "title": "Full Heal",
        "description": "Restores full health.",
        "rarity": "common",
        "icon": "heart_icon",
        "payload": [ { "type": "MUTATE", "target": "self.state.health.value", "op": "SET", "value": 100 } ]
    }
}
```

`DraftOption`: `id`, `title`, `description`, `icon` (all required), `rarity` (`none | common | rare | legendary`, default `none`), `oneOff?`, `conditionIds?`, `conditions?`, `payload` (`BehaviorAction[]`, default `[]`).

```json
"draftPools": {
    "pool_level_up": {
        "id": "pool_level_up",
        "entries": [ { "optionId": "reward_heal", "weight": 10 }, { "optionId": "reward_rare_item", "weight": 1 } ],
        "texts": []
    }
}
```

`DraftPool`: `id`, `entries` (`{ optionId, weight }[]`, default `[]`), `texts` (`string[]`, default `[]`). Both `draftOptions` and `draftPools` are records keyed by id.

## Scripting language (.cvs)

Scripts run line-by-line via the `run <filename>` command. Lines starting with `#` are comments. A real example (`src/data/raw/example/scripts/start.cvs`):

```
# Start example project
game.reset
project-load example/manifest.json
game.spawn newbody newbody
tick.run
game.spawn egg egg
```

### Command reference

Commands come from two bundles merged at runtime (`STANDARD_COMMANDS` and the runtime bundle). Names are literal — there is **no** dot-vs-hyphen aliasing for `game.*` / `project-*` commands. (The only algorithmic aliases are the `fs.` ⇄ `fs-` and `vfs.` ⇄ `vfs-` prefix rewrites.)

**Simulation / game**

| Command                              | Arguments                  | Description                              |
| ------------------------------------ | -------------------------- | ---------------------------------------- |
| `game.spawn`                         | `<blueprintId> [id]`       | Spawn an entity.                         |
| `game.kill`                          | `<entityId>`               | Remove an entity.                        |
| `game.kill-all-bodies-except`        | `<quantity>`               | Cull bodies down to a count.             |
| `game.position`                      | `<entityId> <x> <y>`       | Teleport an entity.                      |
| `game.entities`                      |                            | List runtime entities.                   |
| `game.reset`                         |                            | Reset the runtime.                       |
| `game.dormancy`                      |                            | Enter dormancy.                          |
| `game.rebirth`                       | `[scriptPath]`             | Rebirth; default runs `example/scripts/start.cvs`. |
| `game.save` / `game.load`            | `[name]`                   | Save / load a runtime snapshot.          |
| `tick.run` / `tick.stop` / `tick.step` |                          | Start / pause / single-step the loop.    |
| `run`                                | `<filename>`               | Execute a `.cvs` script.                 |
| `repeat`                             | `<count> <interval_ms> <command...>` | Repeat a command (`-1` = infinite). |
| `transfer.start`                     | `<sourceId> <targetId> <resource> <amount>` | Start a transfer.       |
| `transfer.cancel`                    | `<targetId>`               | Cancel pending transfers to a target.    |
| `target.set`                         | `<entityId> [targetId]`    | Set/clear an entity's target.            |
| `runtime.reload`                     |                            | Reload the runtime from the cartridge.   |

**VFS / files**

| Command       | Arguments        | Description                       |
| ------------- | ---------------- | --------------------------------- |
| `ls`          |                  | List files.                       |
| `cat`         | `[filename]`     | Print a file.                     |
| `save`        | `[filename]`     | Save to VFS (default `game_data.bp`). |
| `rm`          | `<filename>`     | Delete a file (refuses `core.json`). |
| `load`        | `<filename>`     | Import a file from disk into VFS. |
| `makefile`    | `<path>`         | Create a file (alias `vfs.makeFile`). |
| `makedir`     | `<path>`         | Create a directory (alias `vfs.makeDir`). |
| `vfs-tree`    | `[path]`         | Print the VFS tree.               |
| `vfs-scan`    | `<glob>`         | Glob the VFS.                     |
| `vfs-delete`  | `<path...>`      | Delete paths.                    |
| `vfs-move`    | `<from> <toFolder>` | Move a path.                  |
| `fs-load` / `fs-save` | `[folder]` | Bridge to the host filesystem.    |
| `clear` / `help` | `[command]`   | Clear the log / show help.        |

**Project / workspace** (hyphenated names only)

| Command                  | Arguments                         | Description                                 |
| ------------------------ | --------------------------------- | ------------------------------------------- |
| `project-create`         | `<path> <name>`                   | Create and load a workspace.                |
| `project-load`           | `<manifest_path>`                 | Load a manifest, link, and load the runtime.|
| `project-close`          |                                   | Close the active project.                   |
| `project-move`           | `<old_namespace> <new_namespace>` | Rename a namespace and rewrite references.  |
| `project-duplicate`      | `<existing_project> <new_name>`   | Clone a project folder.                     |
| `project-save-blueprint` | `<fq_id>`                         | Serialize, validate, and persist a blueprint. |

> Commands documented in older notes that **do not exist**: `game.new`, `game.init`, `game.absorb`, `set_global`, `open`. Use `project-load` + `game.spawn` + `tick.run` (or a `.cvs` script via `game.rebirth`) instead.

## Examples

**Wood storage** — the real `woodstorage` blueprint authors storage, identity, and placement entirely through abilities; the compiler fills `components` at link time:

```json
{
    "id": "woodstorage",
    "label": "",
    "tags": ["anim:spawn"],
    "components": { "display": { "label": "woodstorage", "display_key": "woodstorage", "style": "woodstorage" }, "passiveEffects": [], "traits": [] },
    "_editor": {
        "abilities": {
            "storage": [ { "resource": "wood", "capacity": { "base": 1200 }, "isDefault": true, "barPosition": "bottom_right", "allowDeposit": true } ],
            "passport": { "label": "Wood Storage", "icon": "wood_storage", "glyphKey": "wood" },
            "worldPresence": { "x": 1755, "y": 1456, "radius": { "min": 20, "max": 80, "valueRef": "self.state.wood.value", "maxRef": "self.state.wood.max" } }
        }
    }
}
```

**Level-up event** (raw behavior rule on `sys_world`):

```json
"sys_world": {
    "state": { "xp": { "value": 0 }, "threshold": { "value": 1000 } },
    "behavior": {
        "rules": [
            {
                "conditions": [ { "tokens": [
                    { "t": "ref", "v": "self.state.xp.value" },
                    { "t": "op",  "v": ">=" },
                    { "t": "ref", "v": "self.state.threshold.value" }
                ] } ],
                "actions": [
                    { "type": "TRIGGER_DRAFT", "poolId": "pool_level_up", "count": 3, "label": "Level Up!" },
                    { "type": "MUTATE", "target": "self.state.xp.value", "op": "SET", "value": 0 },
                    { "type": "MUTATE", "target": "self.state.threshold.value", "op": "ADD", "value": 500 }
                ]
            }
        ]
    }
}
```
