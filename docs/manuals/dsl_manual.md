# Cave Engine DSL Manual

This document defines the data schema and scripting language used to author Cave Engine content.

## Core architecture

- A **module cartridge** is a single JSON file containing metadata, assets, blueprints, draft content, and project config.
- **Blueprints** define component data; runtime entities are instances of blueprints.
- State is reactive. Mutations drive visuals and behavior.
- The **compiler** translates high-level ability config (`_editor.abilities`) into low-level components. Never manually edit compiled components — the compiler overwrites them on save.

## Module cartridge

**Root structure**

```json
{
    "metadata": {
        "id": "my_module",
        "name": "My Game",
        "version": "1.0.0",
        "author": "optional",
        "description": "optional"
    },
    "assets": { "...": "..." },
    "blueprints": { "...": "..." },
    "draftOptions": { "...": "..." },
    "draftPools": { "...": "..." },
    "config": { "...": "..." }
}
```

## Project config

Project-level system config lives under the top-level `config` key in a module cartridge.

**`config` structure**

| Key             | Type                              | Description                                             |
| --------------- | --------------------------------- | ------------------------------------------------------- |
| `traits`        | `Record<string, TraitDefinition>` | Global trait registry.                                  |
| `habiti`        | `Record<string, HabitusDefinition>` | Global habitus definition registry.                   |
| `understanding` | `Record<string, UnderstandingDefinition>` | Global understanding registry.                  |
| `settings`      | `BlueprintSettings`               | Physics, game config, contention, conditions, etc.      |

**`config.settings` keys**

| Key          | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `impulse`    | Physics engine config.                                          |
| `game_config`| Game-level constants and flags.                                 |
| `conditions` | Named condition definitions for use in conditional activation.  |
| `guidances`  | Modal guidance/notification templates.                          |
| `tutorials`  | Tutorial step definitions.                                      |
| `knowledge`  | Knowledge entry definitions.                                    |
| `contention` | Resource contention priority rules.                             |
| `body`       | Habitus type rules governing body generation.                   |
| `carrier`    | Carrier entity settings.                                        |
| `world`      | Singleton override for `sys_world`.                             |

**Contention rule**

```json
"contention": [
    { "resource": "food", "sortBy": "body.xp", "direction": "DESC" }
]
```

## Blueprint structure

**Top-level fields**

| Field        | Type       | Description                       |
| ------------ | ---------- | --------------------------------- |
| `id`         | `string`   | Blueprint id.                     |
| `label`      | `string`   | Display label.                    |
| `tags`       | `string[]` | Tag list for matching and lookup. |
| `components` | `object`   | Component data (see below).       |
| `_editor`    | `object`   | Abilities config (HLL source of truth). |

## Component reference

### display

Controls how the entity appears in the world.

```json
"display": {
    "label": "Wood Storage",
    "icon": "resource_wood",
    "description": "Stores wood.",
    "radius": {
        "min": 20,
        "max": 50,
        "valueRef": "self.state.wood.value",
        "maxRef": "self.state.wood.max"
    },
    "bars": [
        {
            "key": "state.wood",
            "maxKey": "state.wood.max",
            "color": "#00ff00",
            "label": "Wood"
        }
    ]
}
```

### state

Generic data store for an entity.

```json
"state": {
    "wood": { "value": 0, "max": 100, "visible": true },
    "is_active": { "value": 1, "visible": false }
}
```

State entry shape:

| Field          | Type        | Description                                         |
| -------------- | ----------- | --------------------------------------------------- |
| `value`        | `GameValue` | Number, boolean, logic string, or value-node array. |
| `max`          | `GameValue` | Optional max.                                       |
| `min`          | `GameValue` | Optional min.                                       |
| `visible`      | `boolean`   | Show in UI.                                         |
| `allowDeposit` | `boolean`   | Transfer permission flag for storage.               |

**GameValue** can be:
- A `number`
- A `boolean`
- A logic sentence string (e.g. `"self.state.xp.value"`)
- An array of `ValueNode`: `{ ref?, value?, op }` where `op` is `ADD | SET | SUB | MULT | DIV`

### behavior

Runtime logic engine. Rules are evaluated every tick.

```json
"behavior": { "rules": [ "..." ] }
```

See [Behavior logic](#behavior-logic) section.

### assignment

Defines a station that accepts proxies.

```json
"assignment": {
    "slots": 5,
    "locking": true,
    "filter": [],
    "assignedIds": []
}
```

`filter` entries use `ref`, `op`, and `value` where `op` is one of: `GT`, `LT`, `EQ`, `GTE`, `LTE`, `NEQ`.

### automation

Interval-based command execution.

```json
"automation": {
    "type": "interval",
    "command": "game.absorb self",
    "intervalMs": 5000,
    "remainingMs": 0,
    "repeats": -1,
    "label": "Digesting..."
}
```

### passiveEffects

Always-on effects applied every tick.

```json
"passiveEffects": [
    { "op": "SET", "target": "self.state.cost.value", "source": "global.population" }
]
```

`op` supports: `SET`, `ADD`, `SUB`, `MULT`, `DIV`.

### powerSink and powerSource

Connects the entity to the global attribute grid.

```json
"powerSink": {
    "baseDemand": { "body": 10, "mind": 0, "social": 0 },
    "maxDemand": { "body": 100, "mind": 0, "social": 0 },
    "throttle": 1,
    "efficiency": 0,
    "drawFraction": {},
    "status": "nominal"
},
"powerSource": { "attribute": "body" }
```

### buffs

Applies tagged passive effects to other entities.

```json
"buffs": {
    "buffs": [
        { "targetTag": "producer", "effects": [ { "op": "ADD", "target": "self.state.cycle.max", "value": 5 } ] }
    ]
}
```

### physics

Impulse physics configuration.

```json
"physics": { "mass": 100, "radius": 40, "drag": 0.1, "isStatic": true, "x": 500, "y": 500 }
```

### spatial

V2 spatial placement and render radius binding (preferred over manual `physics`/`display` edits).

```json
"spatial": {
    "x": 500,
    "y": 500,
    "radius": { "min": 20, "max": 60, "valueRef": "self.state.food.value", "maxRef": "self.state.food.max" }
}
```

### body

RPG stats for biological entities.

```json
"body": {
    "xp": 0,
    "level": 1,
    "health": 100,
    "maxHealth": 100,
    "baseAttributes": { "body": 1, "mind": 1, "social": 1 }
}
```

### traits

First-class active traits for an entity.

```json
"traits": [
    { "id": "hungry" },
    { "id": "regen", "remainingSeconds": 10 }
]
```

Trait instance shape:

| Field              | Type                                     | Description                                        |
| ------------------ | ---------------------------------------- | -------------------------------------------------- |
| `id`               | `string`                                 | Trait definition id from `config.traits`.          |
| `remainingSeconds` | `number`                                 | Optional duration timer.                           |
| `cycles`           | `Record<string, { accumulatorSeconds }>` | Optional per-cycle accumulator state.              |

### narrative

In-world narrative prompt with optional player choices.

```json
"narrative": {
    "title": "A Strange Visitor",
    "body": "Something emerges from the dark.",
    "priority": "modal",
    "choices": [
        { "label": "Accept", "effects": [ { "op": "ADD", "target": "self.state.xp.value", "value": 100 } ] }
    ]
}
```

`priority`: `toast` | `modal` | `interrupt`.

### cave

Cave-specific display and mood configuration. Provided only for the `sys_cave` entity.

### run and permanent (facts)

Key-value stores for runtime flags.

- `run`: Reset between runs.
- `permanent`: Persisted across runs.

```json
"run": { "tutorial_done": true },
"permanent": { "best_score": 42 }
```

### thought

Transient thought state used by the notification system.

### parent

Links a spawned entity back to its parent blueprint id.

```json
"parent": { "blueprintId": "egg_blueprint" }
```

## Behavior logic

Rules contain a `conditions` list (all must pass) and an `actions` list.

**Logic rule token structure**

Each condition is a list of tokens:

- `keyword`: `IF`, `AND`, `OR`, `NOT`
- `ref`: string reference (e.g. `self.state.hp.value`)
- `op`: operator string
- `val`: numeric literal

**Operator support**

Comparisons: `=`, `==`, `EQ`, `!=`, `NEQ`, `>`, `GT`, `<`, `LT`, `>=`, `GTE`, `<=`, `LTE`

Arithmetic: `+`, `ADD`, `-`, `SUB`, `*`, `MULT`, `/`, `DIV`

**Reference namespaces**

- `self.` — current entity
- `global.` / `globals.` — global values
- Any other id — resolves to a named entity in the snapshot

## Behavior actions

### Mutation

| Action   | Fields                      | Notes                               |
| -------- | --------------------------- | ----------------------------------- |
| `MUTATE` | `target`, `op`, `value`     | `op` is `SET`, `ADD`, or `SUB`.     |

### Lifecycle

| Action                   | Fields                                   | Notes                                   |
| ------------------------ | ---------------------------------------- | --------------------------------------- |
| `SPAWN`                  | `blueprintId`, `id?`, `parentId?`, `forcedHabiti?` | Creates an entity.           |
| `SPAWN_BODY`             | `blueprintId`, `target?`, `parentId?`, `forcedHabiti?` | Spawns a body entity.    |
| `KILL`                   | `entityId`                               | Removes an entity.                      |
| `KILL_ALL_BODIES_EXCEPT` | `quantity`                               | Kills bodies beyond the retained count. |
| `SPAWN_CARRIER`          | `tags[]`, `commands[]`                   | Spawns a carrier with inline commands.  |

### Logistics

| Action     | Fields                                              | Notes                              |
| ---------- | --------------------------------------------------- | ---------------------------------- |
| `TRANSFER` | `source`, `target`, `resource`, `amount`, `isImmediate?` | Moves resources.             |
| `DISPATCH` | `entity`, `target`                                  | Sends proxy to a station.          |

### Trait

| Action          | Fields    | Notes                                           |
| --------------- | --------- | ----------------------------------------------- |
| `ADD_TRAIT`     | `traitId` | Adds a trait instance to entity `traits`.       |
| `REMOVE_TRAIT`  | `traitId` | Removes a trait instance from entity `traits`.  |

### Progression

| Action               | Fields                          | Notes                                          |
| -------------------- | ------------------------------- | ---------------------------------------------- |
| `GAIN_HABITI`        | `habitusId`, `entityId?`        | Grants a habitus to a body entity.             |
| `GAIN_UNDERSTANDING` | `understandingId`, `entityId?`  | Grants an understanding to a body entity.      |

### Meta

| Action                              | Fields                                                | Notes                                        |
| ----------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `TRIGGER_DRAFT`                     | `poolId`, `count?`, `label?`, `triggerEntityId?`, `onComplete?` | Opens draft UI.                |
| `PATCH_BLUEPRINT`                   | `blueprintId`, `components`                           | Runtime blueprint patching.                  |
| `SHOW_NOTIFICATION_ABILITY_GUIDANCE`| `...`                                                 | Shows a notification guidance modal.         |
| `SHOW_CINEMATIC`                    | `...`                                                 | Triggers a cinematic sequence.               |

## Trait definitions

Defined in `config.traits`. Referenced by id from entity `traits` arrays and behavior actions.

```json
"traits": {
    "malnourished": {
        "id": "malnourished",
        "label": "Malnourished",
        "description": "Optional description.",
        "modifiers": [
            { "op": "MULT", "target": "self.state.output.value", "value": 0.5 }
        ],
        "cycles": [
            {
                "id": "tick_hunger",
                "periodSeconds": 1,
                "effects": [ { "op": "SUB", "target": "self.state.health.value", "value": 1 } ]
            }
        ],
        "rules": []
    }
}
```

| Field        | Type               | Description                                    |
| ------------ | ------------------ | ---------------------------------------------- |
| `id`         | `string`           | Trait id.                                      |
| `label`      | `string`           | Display label.                                 |
| `description`| `string`           | Optional description.                          |
| `modifiers`  | `PassiveEffect[]`  | Always-on passive effects.                     |
| `cycles`     | `TraitCycle[]`     | Periodic ticking effects.                      |
| `rules`      | `BehaviorRule[]`   | Optional behavior rule payloads.               |

## Habitus definitions

Defined in `config.habiti`. Habiti are body identity traits that apply permanent effects.

```json
"habiti": {
    "h_worker": {
        "id": "h_worker",
        "label": "Worker",
        "description": "A sturdy laborer.",
        "summary": "Short summary.",
        "type": "profession",
        "effects": [
            { "type": "add_cave_attribute", "attribute": "body", "amount": 2, "description": "" }
        ],
        "excludes": []
    }
}
```

`type` is one of: `species`, `gender`, `social_category`, `profession`, `sexual_preference`, `unique_body`.

**Habitus effect types**

| `type`                           | Additional fields                         | Description                                  |
| -------------------------------- | ----------------------------------------- | -------------------------------------------- |
| `add_cave_attribute`             | `attribute: body|mind|social`, `amount`   | Increases a cave attribute.                  |
| `add_absorption_xp_conversion`   | `amount`                                  | Multiplies XP from absorption.               |
| `add_resource_gain_multiplier`   | `resource`, `amount`                      | Multiplies resource gains.                   |
| `add_producer_output_multiplier` | `producerTag`, `amount`                   | Multiplies output for tagged producers.      |
| `increase_max_purge`             | `amount`                                  | Increases the maximum purge capacity.        |

## Understanding definitions

Defined in `config.understanding`. Understandings are knowledge unlocks with permanent effects.

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

Drafts present a 1-of-N choice and execute their `payload` immediately.

```json
"draftOptions": {
    "reward_heal": {
        "id": "reward_heal",
        "title": "Full Heal",
        "description": "Restores full health.",
        "rarity": "common",
        "icon": "heart_icon",
        "payload": [
            { "type": "MUTATE", "target": "self.state.health.value", "op": "SET", "value": 100 }
        ]
    }
}
```

```json
"draftPools": {
    "pool_level_up": {
        "id": "pool_level_up",
        "entries": [
            { "optionId": "reward_heal", "weight": 10 },
            { "optionId": "reward_rare_item", "weight": 1 }
        ]
    }
}
```

## Scripting language (.cvs)

Scripts are executed line by line in the terminal. Lines starting with `#` are comments.

**Core commands**

| Command         | Arguments                              | Description                                         |
| --------------- | -------------------------------------- | --------------------------------------------------- |
| `game.new`      | `<filename>`                           | Load and initialize a cartridge.                    |
| `game.spawn`    | `<blueprintId> [id]`                   | Spawn an entity.                                    |
| `game.kill`     | `<entityId>`                           | Remove an entity.                                   |
| `game.position` | `<id> <x> <y>`                         | Teleport an entity.                                 |
| `game.absorb`   | `<...entityIds>`                       | Absorb proxies based on `state.processing_outputs`. |
| `game.init`     | `<body_blueprint_id> [auto_run=false]` | Spawn configured Faces, spawn body, optionally run. |
| `tick.run`      |                                        | Start the simulation loop.                          |
| `tick.stop`     |                                        | Pause the simulation loop.                          |
| `set_global`    | `<key> <value>`                        | Set a global value.                                 |

**Helper commands**

| Command  | Arguments           | Description                     |
| -------- | ------------------- | ------------------------------- |
| `rm`     | `<filename>`        | Delete file from VFS.           |
| `open`   | `<filename>`        | Open file in the editor.        |
| `load`   | `<filename>`        | Import file from disk into VFS. |
| `repeat` | `<n> <ms> <cmd...>` | Repeat a command.               |

**Workspace commands**

Canonical command names are hyphenated. Dot aliases are accepted for compatibility.

| Canonical                | Dot alias                | Arguments                         | Description                                 |
| ------------------------ | ------------------------ | --------------------------------- | ------------------------------------------- |
| `project-create`         | `project.create`         | `<path> <name>`                   | Create and load a workspace manifest.       |
| `project-load`           | `project.load`           | `<manifest_path>`                 | Load a valid project manifest and modules.  |
| `project-close`          | `project.close`          |                                   | Close active project and runtime session.   |
| `project-move`           | `project.move`           | `<old_namespace> <new_namespace>` | Move namespace and rewrite references.      |
| `project-duplicate`      | `project.duplicate`      | `<existing_project> <new_name>`   | Clone a project folder and update names.    |
| `project-save-blueprint` | `project.save_blueprint` | `<fq_id>`                         | Serialize, validate, and persist blueprint. |

## Examples

**Sacrificial altar (assignment and absorption)**

```json
"station_altar": {
    "assignment": { "slots": 10, "locking": true },
    "state": {
        "processing_outputs": {
            "value": [
                { "resource": "soul", "source": "lifetime_xp", "factor": 0.5, "target": "sys_world" }
            ],
            "visible": false
        }
    },
    "automation": {
        "type": "interval",
        "command": "game.absorb self",
        "intervalMs": 10000,
        "remainingMs": 0,
        "repeats": -1
    },
    "display": { "label": "Altar of Souls", "icon": "skull" }
}
```

**Level up event (draft trigger)**

```json
"sys_world": {
    "state": { "xp": { "value": 0 }, "threshold": { "value": 1000 } },
    "behavior": {
        "rules": [
            {
                "id": "level_up_trigger",
                "conditions": [
                    { "tokens": [
                        { "t": "ref", "v": "self.state.xp.value" },
                        { "t": "op", "v": ">=" },
                        { "t": "ref", "v": "self.state.threshold.value" }
                    ] }
                ],
                "actions": [
                    { "type": "TRIGGER_DRAFT", "poolId": "pool_level_up", "count": 3, "label": "Level Up!" },
                    { "type": "MUTATE", "target": "self.state.xp", "op": "SET", "value": 0 },
                    { "type": "MUTATE", "target": "self.state.threshold", "op": "ADD", "value": 500 }
                ]
            }
        ]
    }
}
```
