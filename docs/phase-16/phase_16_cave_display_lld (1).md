# Phase 16 — Cave Display LLD

## Document status

This document is the corrected and reviewed low-level design for Phase 16.

It incorporates the locked implementation facts confirmed from the repository and the explicit corrections provided after the first draft:

- Cave rendering must stay inside the existing Phaser display pipeline.
- Cave body/background is owned by `BackgroundModule`.
- Cave size is already data-driven through the existing display-radius path.
- Eye size is a function of the resolved display radius.
- The existing pulse mechanism remains the global animation driver, but Cave eyes do not read pulse directly.
- Pulse preset selection must be driven by Cave emotional state.

This document contains the why, the what, and the how.
It defines every added or changed file, each file’s responsibility, each file’s logic, and each file’s interface.
It contains no implementation code.
It is written as a delta against the existing codebase only.

---

## 1. Why

### 1.1 Product reason

Cave must stop rendering as a generic node and start reading as a creature.

The required presentation is:

- a very large Cave body, already supported by the current radius-driven display system
- a dark Cave body rendered by the existing background renderer
- two expressive cat-like eyes
- gaze that communicates attention
- eye shape and color that communicate emotion
- pupil motion and dilation that communicate focus and mood
- a pulse preset that reflects Cave emotion, without pulse deforming the eyes themselves

### 1.2 Technical reason

The current repository already provides the correct ownership boundaries:

- display creation and ticking are owned by `DisplayInstanceManager` and display-module stacks
- Cave already renders with display key `cave_level`
- display size already comes from `resolveDisplaySpec` and `resolveDisplayRadius`
- the body/background blob is already owned by `BackgroundModule`
- pulse is already a global engine mechanism owned by `VeinsSystem` and `PulseEngine`
- selection currently lives in UI state and is injected into Phaser through `WorldInteractionContext`
- drag currently lives in `EntityDragController`
- world health is currently a Cave-wide derived state on `sys_world.state.health`

The missing pieces are therefore not a new renderer architecture, but the following feature-specific additions:

- rename Cave health to comfort
- mirror runtime selection and drag into ECS state
- simulate Cave attention and emotions in runtime state
- add a dedicated `cave_level` display definition that reuses `BackgroundModule` and adds Cave-specific eye rendering
- make pulse preset selection prefer Cave emotional output

---

## 2. What

Phase 16 does exactly the following.

### 2.1 Included

1. Rename Cave world state `health` to `comfort`, preserving its exact computation and gameplay effect.
2. Add Cave mind state under `sys_world.cave.mind`.
3. Mirror selected entity and drag state into `sys_world.state` through commands.
4. Add explicit Cave event counters for events whose cause must not be guessed.
5. Add a new runtime `CaveMindSystem` that resolves:
    - attention salience
    - attention target
    - look mode
    - emotional channels
    - eye render state
    - pulse preset key
6. Register a dedicated display definition for `cave_level`.
7. Keep Cave body rendering in `BackgroundModule`.
8. Add a Cave-only eye renderer module that reads `cave.mind.render`.
9. Make `VeinsSystem` prefer Cave pulse output and fall back to the existing heartbeat rule path.
10. Update authored source files, UI labels, and tests to use `comfort` instead of `health` for the Cave world state.

### 2.2 Explicitly excluded

This phase does not include any of the following:

- React overlay rendering
- any change to the `DisplayInstanceManager` architecture
- any change to how normal entities derive their display size
- any use of pulse to move or deform the Cave eyes
- any generalized event bus
- any new scripting language or free-form rule engine
- any rename of body health or body maxHealth
- any unrelated refactor of the UI selection system or drag system
- manual editing of save snapshots as source-of-truth content

---

## 3. How

## 3.1 Locked design decisions

1. Cave body ownership remains with `BackgroundModule`.
2. Cave size remains the existing resolved `spec.radius` produced by the display system.
3. Eye dimensions, spacing, and movement amplitude are all derived from `spec.radius`.
4. Cave eyes are rendered by a new display module inside the `cave_level` module stack.
5. Cave eyes read runtime state only; they do not compute business logic.
6. Runtime selection remains in the UI store for UI purposes, but a mirrored copy is written into ECS state for Cave mind simulation.
7. Drag remains in `EntityDragController`, but drag state is mirrored into ECS state for Cave mind simulation.
8. Attention is modeled as per-entity decaying salience.
9. Emotion is modeled as four independent decaying channels: happiness, sadness, terror, curiosity.
10. Render output is derived from attention plus emotion.
11. Pulse preset is derived from Cave emotional state, then consumed by the existing pulse system.
12. Cause-sensitive emotional events are explicit and never inferred from disappearance alone.

---

## 4. Runtime data model

## 4.1 Rename Cave health to comfort

`sys_world.state.health` becomes `sys_world.state.comfort`.

The formula does not change.
The gameplay meaning does not change.
The body efficiency multiplier does not change.
Only the name changes.

The following authored references must change from `health` to `comfort` when they refer to the Cave world state:

- world behavior rules
- Cave display radius references
- Cave display bar references
- Cave selection card references
- Cave-facing UI labels and tooltips
- authored heartbeat rule references that read the world state

This rename does not touch body health or body maxHealth.

## 4.2 New mirrored runtime input keys on `sys_world.state`

These values are written through commands and consumed by `CaveMindSystem`.
They are internal runtime plumbing.
They are not user-facing display stats.

Required keys:

- `cave_selected_entity_id`
    - type: string
    - empty string means no selection
- `cave_drag_entity_id`
    - type: string
    - empty string means no active drag
- `cave_drag_active`
    - type: boolean

These are mirrored inputs only.
They are not the emotional model itself.

## 4.3 New explicit Cave event counters on `sys_world.state`

These are the explicit event sources used by `CaveMindSystem` for events whose cause must not be guessed.

Required keys:

- `cave_evt_purge_began`
    - type: number
    - monotonically increasing counter
- `cave_evt_purge_kill`
    - type: number
    - monotonically increasing counter
- `cave_evt_absorption_complete`
    - type: number
    - monotonically increasing counter
- `cave_evt_butchered`
    - type: number
    - monotonically increasing counter

Each counter must be initialized in the default world state so `ADJUST_STATE` can safely increment it.

## 4.4 New `sys_world.cave.mind` subtree

`sys_world.cave.mind` is the authoritative Cave inner-state component for this feature.

It has five subtrees.

### 4.4.1 `cave.mind.attention`

Purpose: resolved attention output for debugging, future UI, and renderer input.

Fields:

- `targetEntityId`
    - string
    - empty string means no target
- `targetWorldX`
    - number
- `targetWorldY`
    - number
- `lookMode`
    - enum
    - allowed values: `idle`, `track`, `inspect`, `panic_scan`, `lock`
- `dominantStimulus`
    - string
    - winning stimulus key from the config catalog
- `focusStrength`
    - number in the closed range 0 to 1
- `candidateIds`
    - ordered string array
    - highest salience first
    - maximum length: 3

### 4.4.2 `cave.mind.emotions`

Purpose: persistent emotional channels.

Fields:

- `happiness`
- `sadness`
- `terror`
- `curiosity`

All four fields are normalized numbers in the closed range 0 to 1.

### 4.4.3 `cave.mind.render`

Purpose: render-facing Cave eye state.

This is the only Cave-specific data the display module needs to read.

Fields:

- `eyeShape`
    - enum
    - allowed values: `neutral`, `happy`, `unhappy`, `scared`, `anticipating`
- `eyeColor`
    - string
    - final resolved color in display-ready form
- `eyeOffsetX`
    - number in the closed range -1 to 1
    - normalized whole-eye horizontal offset
- `eyeOffsetY`
    - number in the closed range -1 to 1
    - normalized whole-eye vertical offset
- `pupilSize`
    - number in the closed range 0 to 1
    - 0 means narrowest slit, 1 means most dilated
- `pupilOffsetX`
    - number in the closed range -1 to 1
- `pupilOffsetY`
    - number in the closed range -1 to 1
- `blinkIntervalMs`
    - number
- `blinkDurationMs`
    - number
- `blinkPhaseMs`
    - number

All geometry is normalized.
The display module scales these values by the resolved display radius.

### 4.4.4 `cave.mind.pulsePresetKey`

Purpose: direct pulse output for the existing pulse system.

Field:

- `pulsePresetKey`
    - string
    - empty string means no Cave override and forces fallback to the existing heartbeat rule path

Phase 16 uses existing preset keys already supported by authored assets.
The mapping from emotions to preset key is defined in the Cave mind config catalog.

### 4.4.5 `cave.mind.memory`

Purpose: deterministic per-tick memory for decay, deltas, and event detection.

Fields:

- `previousComfort`
    - number
- `previousXp`
    - number
- `previousLevel`
    - number
- `previousPurgeActive`
    - boolean
- `previousSelectedEntityId`
    - string
- `previousDragEntityId`
    - string
- `previousDragActive`
    - boolean
- `previousEventCounters`
    - object with keys `purgeBegan`, `purgeKill`, `absorptionComplete`, `butchered`
- `entities`
    - record keyed by entity id

Each entity memory record stores only the values needed for deterministic attention updates:

- previous world position
- previous salience value
- previous cycle value and cycle max
- previous absorption progress and absorption max
- previous assigned count
- previous proxy-inbound status
- previous selected status
- previous dragged status
- previous cycle-active status
- previous trait ids relevant to Cave emotion

Entity memory must be pruned for entities that no longer exist.

---

## 5. Data-driven behavior model

## 5.1 Extensibility mechanism

This phase does not introduce a free-form rule language.
That would violate the project contract and expand scope.

Instead, modularity is achieved through a typed Cave mind config catalog.

The catalog owns:

- salience decay
- fixation hysteresis
- stimulus weights
- stimulus multipliers
- emotion decay rates
- emotional baseline rates
- emotional impulse magnitudes
- eye-shape mapping
- eye-color mapping
- blink tuning
- pulse preset mapping

The system logic stays generic.
The actual tuning stays data-driven.

## 5.2 Required authored tags

To satisfy the user requirement that the emotional world map be modular and data-driven, two authored tags are required.

### `src/data/raw/example/modules/explore.bp`

Add tag `cave_exploration`.

Purpose:

- marks exploration nodes as a curiosity source
- keeps exploration-specific interest out of hardcoded blueprint-id checks

### `src/data/raw/example/modules/butcher.bp`

Add tag `cave_butcher`.

Purpose:

- marks butcher stations as the explicit source of butcher sadness events
- allows `AbsorbBatchHandler` to increment the correct explicit event counter without guessing

No other authored tag additions are required for Phase 16.

---

## 6. Simulation rules

## 6.1 Attention model

Attention is per-entity decaying salience.

Each tick, `CaveMindSystem` must:

1. build the current fingerprint for each candidate entity
2. compare it to memory
3. generate salience contributions
4. apply decay
5. select the top target with hysteresis
6. derive the look mode
7. resolve normalized eye and pupil target offsets

### 6.1.1 Candidate set

Candidate entities are all runtime entities except:

- `sys_world`
- entities with no physics body
- display-only system artifacts that are not legitimate world attention targets

### 6.1.2 Required salience sources

The following inputs are mandatory because they were explicitly requested.

- Panic-looking-around is not an entity salience source; it is a look mode selected from emotional state.
- Incoming proxy is a salience source.
- Ongoing absorption is a salience source.
- Any active assignment-cycle node is a salience source.
- Selected node is a salience source.
- Player-dragged node is a salience source and must be one of the strongest sustained signals.
- Cycle approaching completion is a salience source.
- Longer cycles score higher than shorter cycles when progress ratios are similar.

### 6.1.3 Required delta-based contributions

The following delta contributions are mandatory.

- entity appears this tick: large impulse
- entity disappears: memory entry removed, no guessed emotional cause
- entity moves: continuous small contribution scaled by movement distance
- proxy inbound state changes: large impulse
- assignment count changes: medium impulse
- absorption progress changes: medium impulse
- cycle progress changes: medium impulse scaled by cycle max
- selected state changes to selected: large impulse
- drag state changes to active: very large impulse

### 6.1.4 Required sustained contributions

The following sustained contributions are mandatory.

- selected entity bonus
- dragged entity bonus
- inbound proxy bonus
- active assignment bonus
- active absorption bonus
- nearing-completion bonus from cycle progress ratio
- invested-effort bonus from cycle max

### 6.1.5 Required multipliers

The salience multiplier layer must support, at minimum:

- proxy multiplier
- selected multiplier
- dragged multiplier
- assignment multiplier
- absorption multiplier
- exploration multiplier

These multipliers live in the config catalog, not in display code.

### 6.1.6 Target resolution

Target resolution rules are locked.

- The system keeps the current target unless a challenger clears the hysteresis threshold.
- The renderer never chooses the target.
- If there is no valid target, `targetEntityId` is empty and look mode is `idle` unless terror forces `panic_scan`.

## 6.2 Emotion model

Emotion is a four-channel decaying vector.

Channels:

- happiness
- sadness
- terror
- curiosity

There is no single stored mood enum.
`eyeShape` is derived from this vector.
`anticipating` is a render result, not a primitive emotion.

### 6.2.1 Required continuous emotional influences

These are evaluated every tick.

- higher comfort increases happiness baseline
- lower comfort increases sadness baseline
- any active node tagged `cave_exploration` increases curiosity baseline
- first active cycle on a previously unseen node increases curiosity through an impulse, then contributes ongoing curiosity while active
- ongoing absorption increases curiosity baseline
- active purge increases terror baseline
- any live body carrying trait `starving` increases sadness baseline
- any live body carrying trait `cold` increases sadness baseline

### 6.2.2 Required impulse influences

These are generated from explicit counters or deterministic deltas.

- comfort rose quickly: happiness impulse
- absorption complete: happiness impulse
- purge began: terror impulse and curiosity impulse
- body killed by purge: terror impulse
- body butchered: sadness impulse
- xp increased this tick: curiosity impulse
- level increased this tick: happiness impulse
- first cycle activation on a new node: curiosity impulse

### 6.2.3 Cause ownership

Cause-sensitive impulses must come from the owning system or handler.

- purge began is emitted by the purge evaluation path
- purge kill is emitted by the purge evaluation path at the same time it issues the kill command
- absorption complete is emitted by `AbsorbBatchHandler`
- butchered is emitted by `AbsorbBatchHandler` only when the absorbing station is tagged `cave_butcher`

No disappearance heuristic is allowed for these events.

## 6.3 Render resolution

The Cave mind system, not the display module, resolves the render state.

### 6.3.1 Eye shape

Eye shape is derived from dominant emotional composition.

Required outputs:

- `happy`
- `unhappy`
- `scared`
- `anticipating`
- `neutral`

Derivation rules:

- terror-dominant produces `scared`
- sadness-dominant produces `unhappy`
- happiness-dominant produces `happy`
- curiosity-dominant with strong focus produces `anticipating`
- otherwise produce `neutral`

### 6.3.2 Eye color

Eye color is resolved from the four-channel emotional mix through the config catalog.

The display module receives a final resolved color string only.
The display module does not mix emotions into colors.

### 6.3.3 Eye position and pupil position

The system resolves normalized offsets from:

- target direction
- focus strength
- look mode

Whole-eye offset and pupil offset are both outputs because the user explicitly requires both.

### 6.3.4 Pupil size

Pupil size is resolved from emotional state and look mode.

Required behavior:

- terror can widen the pupil
- high-focus anticipation can narrow the pupil into a stronger slit
- curiosity can widen the pupil moderately
- sadness narrows movement energy and reduces dilation pressure

### 6.3.5 Blink

Blink timing is part of render state, not of pulse.

The Cave mind system resolves blink cadence from emotional state.
The display module samples the blink envelope from time and the provided blink timing fields.

## 6.4 Look mode resolution

Look mode is a derived state.

Required modes:

- `idle`
- `track`
- `inspect`
- `panic_scan`
- `lock`

Required behavior:

- terror with weak target resolves to `panic_scan`
- terror with strong target resolves to `lock`
- strong dragged target resolves to `track`
- strong incoming proxy resolves to `lock`
- strong cycle-near-complete target with high curiosity resolves to `inspect` or `lock` based on config thresholds
- weak target with low emotion pressure resolves to `idle`

## 6.5 Pulse preset resolution

Pulse preset is derived from Cave emotion in `CaveMindSystem`.

Rules:

- the mapping lives in the Cave mind config catalog
- the output is written to `sys_world.cave.mind.pulsePresetKey`
- `VeinsSystem` must use this preset first when the key is non-empty
- if the key is empty, `VeinsSystem` falls back to the current heartbeat-rule mechanism unchanged

This keeps pulse as the existing engine-level feature while making its active preset emotionally driven.

---

## 7. Display design

## 7.1 Cave module stack

`cave_level` must be registered with the following module stack, in this exact order:

1. `TransformModule`
2. `BackgroundModule`
3. `CaveEyesModule`
4. `InteractionModule`
5. `SelectionModule`

### Why this order is locked

- `TransformModule` must continue to own world placement.
- `BackgroundModule` must continue to own the Cave body.
- `CaveEyesModule` must render on top of the body.
- `InteractionModule` must keep using the background-owned interactive target.
- `SelectionModule` must remain topmost.

No glyph module is used for Cave.
No distress module is used for Cave.
No React overlay is used for Cave.

## 7.2 Cave body ownership

Cave body rendering remains exactly where it belongs now: inside `BackgroundModule`.

The only feature-specific change required is how `BackgroundModule` chooses the fill band for `cave_level`.

For `cave_level`, `BackgroundModule` must render a single dark full-body fill band.
It must keep using the resolved display radius.
It may keep using pulse for body wobble exactly as it does now.

It must not read Cave eye state.

## 7.3 Cave eye rendering ownership

A new `CaveEyesModule` owns only the eyes.

It must:

- read `entity.cave.mind.render`
- size all eye geometry from `tickCtx.spec.radius`
- draw cat-like eyes with slit-capable pupils
- use normalized offsets provided by the runtime state
- use the provided blink timing fields
- ignore `tickCtx.pulseValue`

It must not:

- choose the Cave target
- compute emotion
- compute pulse preset
- compute color blending from raw emotion values
- read UI stores or React state

## 7.4 Radius ownership

Cave hugeness remains existing display data.

The only allowed size source for Cave body and eyes is the resolved `spec.radius` produced by:

- display component radius config
- current Cave comfort value reference
- existing `resolveDisplayRadius` logic

This phase does not add any parallel size system.

---

## 8. File-by-file design

## 8.1 Source files to change

### `src/data/schemas/game/cave.ts`

Responsibility:

- define the Cave component schema and TypeScript types

Change:

- add the `mind` subtree described in Section 4.4

Logic:

- schema defaults must produce a valid neutral Cave mind state
- the schema must stay serializable and deterministic

Interface:

- exported `CaveComponentSchema` now includes `mind`
- exported `CaveComponent` type now includes `mind`

### `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

Responsibility:

- define update-command payload types

Change:

- extend `UpdateCaveCommandPayload` to accept a `mind` patch

Logic:

- the payload must support replacing the resolved Cave mind subtree in one command
- the payload must not introduce partial free-form nested mutation semantics

Interface:

- `UpdateCaveCommandPayload` gains optional `mind`

### `src/engine/runtime/handlers/UpdateCaveHandler.ts`

Responsibility:

- apply `UPDATE_CAVE` payloads to the runtime world during apply phase

Change:

- apply the `mind` patch to `entity.cave.mind`

Logic:

- preserve existing behavior for progression, attributes, and purge
- when `mind` is provided, replace the Cave mind subtree deterministically
- reject missing-entity and missing-cave-component cases exactly as the handler does today

Interface:

- same command type
- broader accepted payload
- no new command type

### `src/data/schemas/v2/worldClampRules.ts`

Responsibility:

- define authored default world rules for Cave-wide food, heat, and derived vitality

Change:

- rename the world vitality rule set from `health` references to `comfort` references

Logic:

- the formula remains the same
- only identifiers, targets, and condition refs change

Interface:

- the exported rule collection remains the same shape
- rule ids and state paths now use `comfort`

### `src/data/schemas/v2/systemDefaults.ts`

Responsibility:

- define the default runtime world entity

Change:

- initialize `state.comfort` instead of `state.health`
- initialize the new mirrored input keys and event counters
- update `display.radius.valueRef`, `display.radius.maxRef`, and Cave bar definitions to `comfort`

Logic:

- default Cave comfort starts at the same effective value as old health
- default selection and drag mirrors start empty/inactive
- default counters start at zero

Interface:

- exported default world entity shape now contains the new state keys

### `src/game/systems/BodySystem.ts`

Responsibility:

- compute body updates using Cave-wide efficiency scaling

Change:

- rename the world multiplier source from `state.health` to `state.comfort`

Logic:

- multiplier semantics remain unchanged

Interface:

- no public interface change
- internal world-state key changes from `health` to `comfort`

### `src/game/main.ts`

Responsibility:

- register systems and handlers in runtime order

Change:

- register `CaveMindSystem`

Logic:

- `CaveMindSystem` must be registered immediately after `CaveSystem`
- this order is required because `CaveSystem` currently drains world XP into `cave.progression` before later systems read the same snapshot object

Interface:

- runtime system list gains `CaveMindSystem`

### `src/game/systems/CaveSystem.ts`

Responsibility:

- own Cave progression and purge command emission

Change:

- no new feature logic is added here
- only comfort rename fallout is addressed if this file refers to the old key in tests or comments

Logic:

- this file remains progression/purge focused
- it does not own attention or emotion

Interface:

- unchanged

### `src/engine/phaser/scenes/entityDragController.ts`

Responsibility:

- convert Phaser drag gestures into runtime commands

Change:

- mirror drag start and drag end into `sys_world.state`

Logic:

- on drag start, set `cave_drag_active = true` and `cave_drag_entity_id = dragged entity id`
- on drag end, set `cave_drag_active = false` and `cave_drag_entity_id = empty string`
- existing movement commands remain unchanged
- the controller does not compute Cave salience

Interface:

- no new external constructor dependency
- emits extra existing command types: `UPDATE_STATE`

### `src/ui/runtime/world/context/GameWorldAdapter.tsx`

Responsibility:

- provide runtime world dependencies to the UI through context

Change:

- call the new selection-sync hook and remain a render-only adapter

Logic:

- this file must not contain the selection mirroring logic inline

Interface:

- unchanged provider interface

### `src/engine/phaser/display/DisplayDefinitionCatalog.ts`

Responsibility:

- register display definitions for display keys

Change:

- register the `cave_level` module stack defined in Section 7.1

Logic:

- no other display keys change

Interface:

- `cave_level` now resolves to a dedicated display definition instead of the fallback placeholder definition

### `src/engine/phaser/display/modules/backgroundBandSelector.ts`

Responsibility:

- choose fill bands for `BackgroundModule`

Change:

- add a Cave-specific branch for `cave_level`

Logic:

- when `displayKey` is `cave_level`, return a single dark constant band
- all existing logic for assignable nodes, cycle fills, and attribute nodes remains unchanged

Interface:

- function signature unchanged
- output for `cave_level` is now deterministic and Cave-specific

### `src/engine/phaser/veins/VeinsSystem.ts`

Responsibility:

- own pulse engine configuration, active preset selection, and veins display data

Change:

- prefer `sys_world.cave.mind.pulsePresetKey` when present
- fall back to existing heartbeat rule resolution when the key is empty

Logic:

- the pulse engine remains the only owner of actual pulse sampling
- Cave emotion only changes which preset is active

Interface:

- no constructor change
- no pulse engine API change

### `src/ui/runtime/world/selection/cave/useCaveData.ts`

Responsibility:

- provide live Cave card data and progress-bar refs

Change:

- rename the Cave vitality bar from health to comfort

Logic:

- `useEntityBarRef` must read `state.comfort.value` and `state.comfort.max`

Interface:

- returned property is renamed from `healthFillRef` to `comfortFillRef`

### `src/ui/runtime/world/selection/cave/CaveVitalsSection.tsx`

Responsibility:

- render the Cave vitals section

Change:

- label and path change from health to comfort
- prop rename from `healthFillRef` to `comfortFillRef`

Logic:

- user-facing label must be `Comfort`

Interface:

- prop name changes to `comfortFillRef`

### `src/ui/runtime/world/selection/CaveCard.tsx`

Responsibility:

- compose the Cave selection card

Change:

- pass `comfortFillRef` through to `CaveVitalsSection`

Logic:

- no business logic is added

Interface:

- internal prop wiring only

### `src/ui/lib/foundation/icon-registry/defaultIcons.ts`

Responsibility:

- provide default icon text and tooltips

Change:

- update the Cave tooltip text from health wording to comfort wording

Logic:

- this is user-facing copy only
- body health copy remains unchanged

Interface:

- unchanged export surface

### `src/ui/devtools/editors/blueprint/mode/forms/WorldPresenceAbilityForm.tsx`

Responsibility:

- provide static suggestions for authored world-presence radius refs

Change:

- update Cave-oriented default suggestions from `self.state.health.*` to `self.state.comfort.*`

Logic:

- this keeps authored content aligned with the rename

Interface:

- unchanged component props
- updated suggestion values

### `src/data/raw/example/modules/assets.art`

Responsibility:

- authored vein heartbeat presets and rules used by source content

Change:

- any Cave-world heartbeat rule that reads `global.health` must read `global.comfort`

Logic:

- keeps authored source content consistent with the rename
- Cave pulse override still has precedence at runtime when present

Interface:

- authored asset schema unchanged

### `src/data/raw/example/modules/explore.bp`

Responsibility:

- authored exploration blueprint

Change:

- add tag `cave_exploration`

Logic:

- this tag is the exploration curiosity signal

Interface:

- blueprint tags only

### `src/data/raw/example/modules/butcher.bp`

Responsibility:

- authored butcher station blueprint

Change:

- add tag `cave_butcher`

Logic:

- this tag is the explicit butcher sadness signal

Interface:

- blueprint tags only

## 8.2 Source files to add

### `src/ui/runtime/world/context/useSyncRuntimeSelection.ts`

Responsibility:

- mirror UI selection into ECS runtime state through commands

Logic:

- observe runtime instance and selected entity id
- enqueue `UPDATE_STATE` to `sys_world` only when the mirrored selection value actually changes
- write empty string when selection is cleared
- do nothing when runtime is null

Interface:

- input: current runtime and selected entity id
- output: none
- side effect: command enqueue only

### `src/game/systems/CaveMindSystem.ts`

Responsibility:

- orchestrate Cave attention, emotion, render, and pulse resolution each tick

Logic:

- read `sys_world`, snapshot entities, physics bodies, mirrored selection, mirrored drag, and explicit event counters
- call the pure Cave-mind helper functions
- emit a single `UPDATE_CAVE` command with the fully resolved `mind` subtree

Interface:

- standard ECS system interface only

### `src/game/systems/cave/CaveMindConfig.ts`

Responsibility:

- own all tuneable Cave salience, emotion, render, and pulse parameters

Logic:

- provide one canonical data source for:
    - salience weights
    - salience multipliers
    - salience decay
    - fixation hysteresis
    - emotion decay
    - emotion baseline rates
    - emotion impulse magnitudes
    - render mapping thresholds
    - eye-color palette mapping
    - blink timing presets
    - pulse preset mapping

Interface:

- exports typed immutable config objects only

### `src/game/systems/cave/caveMindTypes.ts`

Responsibility:

- define the local Cave-mind domain types used by the system and helper files

Logic:

- centralize type definitions for fingerprints, stimuli, salience entries, emotion vectors, and render outputs

Interface:

- type exports only

### `src/game/systems/cave/collectCaveStimuli.ts`

Responsibility:

- read the snapshot and mirrored runtime inputs and produce the current Cave stimulus set

Logic:

- build one per-entity candidate record
- extract the required signal fields listed in Section 6.1
- read trait-driven sadness inputs from live body entities
- read explicit event counters from `sys_world.state`

Interface:

- input: snapshot, current Cave memory, config
- output: typed current-stimulus structure

### `src/game/systems/cave/updateCaveSalience.ts`

Responsibility:

- update decaying salience memory and compute current salience ranking

Logic:

- apply delta-based impulses
- apply sustained bonuses
- apply multipliers
- apply decay
- prune missing entities

Interface:

- input: current stimuli, previous memory, config
- output: updated memory plus ranked salience results

### `src/game/systems/cave/updateCaveEmotions.ts`

Responsibility:

- update the four emotional channels from current stimuli and previous emotion state

Logic:

- apply decay first
- add continuous baseline contributions
- add impulse contributions from explicit counters and deterministic deltas
- clamp every channel to the closed range 0 to 1

Interface:

- input: current Cave world signals, previous emotions, previous memory, config
- output: next emotions

### `src/game/systems/cave/resolveCaveAttention.ts`

Responsibility:

- pick the current attention target and look mode from salience and emotions

Logic:

- apply hysteresis
- return top candidates
- derive look mode using the rules in Section 6.4

Interface:

- input: ranked salience, previous attention, emotions, config
- output: next attention

### `src/game/systems/cave/resolveCaveRenderState.ts`

Responsibility:

- map attention and emotions into display-ready eye parameters and pulse preset key

Logic:

- resolve eye shape
- resolve eye color
- resolve whole-eye offsets
- resolve pupil offsets
- resolve pupil size
- resolve blink timing
- resolve pulse preset key

Interface:

- input: attention, emotions, config
- output: render subtree plus pulse preset key

### `src/engine/phaser/display/modules/CaveEyesModule.ts`

Responsibility:

- render Cave eyes on top of the Cave body using the display-module pipeline

Logic:

- read `tickCtx.entity.cave.mind.render`
- derive absolute eye geometry from `tickCtx.spec.radius`
- draw both eyes and both pupils each tick
- apply blink timing using `tickCtx.timeMs`
- skip rendering when radius is not visible or Cave mind data is absent
- never read `pulseValue`

Interface:

- standard display-module factory interface only

### `src/engine/phaser/display/modules/caveEyesRenderMath.ts`

Responsibility:

- provide the pure geometry helpers used by `CaveEyesModule`

Logic:

- convert normalized render values into radius-scaled absolute positions and dimensions
- provide shape-specific geometry for neutral, happy, unhappy, scared, and anticipating eye presets
- provide cat-pupil slit geometry from `pupilSize`

Interface:

- pure functions only

## 8.3 Test files to add or update

### `src/game/systems/CaveMindSystem.test.ts`

Responsibility:

- integration-test the Cave mind system against a real snapshot and command buffer

Coverage required:

- selected entity becomes the attention target when selection mirror is set
- dragged entity becomes dominant while drag is active
- incoming proxy outranks weak background motion
- near-complete long cycle outranks a shorter equal-ratio cycle
- purge-began counter increases terror and updates pulse preset output
- absorption-complete counter increases happiness
- butcher counter increases sadness only for butcher-tagged completion
- comfort rise increases happiness
- xp increase increases curiosity
- level increase increases happiness

Interface:

- test-only

### `src/game/systems/cave/updateCaveSalience.test.ts`

Responsibility:

- unit-test salience decay, impulses, multipliers, and sustained interest

Coverage required:

- appearance spike
- movement contribution
- drag-began spike
- drag-active sustained bonus
- selected sustained bonus
- cycle-max weighting
- hysteresis-friendly ranking output
- pruning of missing memory entries

Interface:

- test-only

### `src/game/systems/cave/updateCaveEmotions.test.ts`

Responsibility:

- unit-test emotion decay and influence mapping

Coverage required:

- high comfort drives happiness
- low comfort drives sadness
- exploration tag drives curiosity
- active purge drives terror
- starving and cold traits drive sadness
- explicit event counters create correct impulses
- outputs clamp to the closed range 0 to 1

Interface:

- test-only

### `src/game/systems/cave/resolveCaveAttention.test.ts`

Responsibility:

- unit-test target selection and look-mode resolution

Coverage required:

- idle when no target exists
- track for strong dragged target
- lock for strong inbound proxy with high focus
- panic_scan when terror is high and no dominant target exists
- inspect when curiosity is high and a strong cycle target exists
- hysteresis preserves the current target until threshold is crossed

Interface:

- test-only

### `src/game/systems/cave/resolveCaveRenderState.test.ts`

Responsibility:

- unit-test eye shape, color, pupil size, and pulse preset derivation

Coverage required:

- terror-dominant maps to scared shape
- sadness-dominant maps to unhappy shape
- curiosity plus strong focus maps to anticipating shape
- pupil dilation widens under terror
- pupil narrows under focused anticipation
- pulse preset changes with emotional dominance

Interface:

- test-only

### `src/engine/phaser/display/modules/CaveEyesModule.test.ts`

Responsibility:

- test the Cave eye display module as a display-only renderer

Coverage required:

- renders nothing when Cave mind render data is absent
- scales geometry from `spec.radius`
- applies normalized offsets correctly
- applies blink timing from render state and time
- ignores `pulseValue`

Interface:

- test-only

### `src/engine/phaser/display/modules/backgroundBandSelector.test.ts`

Responsibility:

- verify BackgroundModule band selection behavior

Required update:

- add a Cave-specific test asserting that `cave_level` resolves to the dark full-body fill band
- keep all existing non-Cave tests unchanged

Interface:

- test-only

### `src/engine/phaser/veins/NervousSystemRules.test.ts`

Responsibility:

- verify fallback heartbeat rule selection

Required update:

- rename world-state reference from `health` to `comfort`

Interface:

- test-only

### `src/ui/runtime/world/context/GameWorldAdapter.test.tsx`

Responsibility:

- verify GameWorldAdapter continues to bridge context correctly

Required update:

- add assertions that selection mirroring enqueues the correct runtime command when the selected entity changes
- add the negative case where no command is sent when runtime is null

Interface:

- test-only

### `src/engine/phaser/scenes/entityDragController.test.ts`

Responsibility:

- verify drag mirroring behavior in the controller

Coverage required:

- drag start sets active flag and dragged entity id
- drag end clears both mirrored keys
- existing movement commands still fire correctly
- proxy entities still remain non-draggable

Interface:

- test-only

### `src/ui/runtime/world/selection/CaveCard.test.tsx`

Responsibility:

- keep the Cave card smoke test aligned with the rename

Required update:

- use `state.comfort`
- assert the section still renders correctly with the renamed label

Interface:

- test-only

### `src/game/systems/BodySystem.cave.test.ts`

Responsibility:

- verify body bonuses still scale with Cave-wide vitality

Required update:

- rename world-state setup from `health` to `comfort`
- rename test wording from health to comfort

Interface:

- test-only

### `src/game/systems/testUtils.ts`

Responsibility:

- provide reusable test entities for game systems

Required update:

- rename the default world-state field from `health` to `comfort`

Interface:

- test utility only

---

## 9. Implementation sequence

The work must be executed in this order.

1. Rename Cave world health to comfort in defaults, rules, UI bindings, and tests.
2. Add Cave mind schema and command-handler support.
3. Add selection sync hook and drag mirroring.
4. Add explicit event counter writes in purge and absorption paths.
5. Add pure Cave-mind helper files and unit tests.
6. Add `CaveMindSystem` and register it after `CaveSystem`.
7. Add `cave_level` display definition and `CaveEyesModule`.
8. Update `backgroundBandSelector` for Cave dark fill.
9. Update `VeinsSystem` to prefer Cave pulse output.
10. Finish all affected integration, display, and UI smoke tests.

This order minimizes ambiguity and keeps each step reviewable.

---

## 10. Error handling and negative-path requirements

The following behaviors are mandatory.

- If `sys_world` is missing, `CaveMindSystem` does nothing and emits no command.
- If `sys_world.cave` is missing, `CaveMindSystem` does nothing and emits no command.
- If mirrored selection references a missing entity, Cave clears the target unless another candidate wins salience.
- If mirrored drag references a missing entity, Cave clears the drag contribution.
- If a candidate has no physics body, it cannot become an attention target.
- If Cave render data is absent, `CaveEyesModule` renders nothing and leaves the body intact.
- If `pulsePresetKey` is empty, `VeinsSystem` falls back cleanly to its existing rule path.
- If authored tags are absent, only the related stimuli are absent; the system continues to run.

Silent failure is forbidden.
Existing handler and system error logging behavior must be preserved.

## 12. Final acceptance criteria

Phase 16 is complete only when all of the following are true.

1. Cave world health has been fully renamed to comfort without changing gameplay semantics.
2. `cave_level` renders through a dedicated display definition.
3. Cave body remains rendered by `BackgroundModule`.
4. Cave eyes render through a Cave-specific display module and scale from `spec.radius`.
5. Cave attention is resolved from decaying per-entity salience.
6. Cave emotion is resolved from the four required channels with decay.
7. Pulse preset selection is derived from Cave emotion and consumed by the existing pulse engine.
8. Selection and drag are mirrored into ECS state through commands.
9. Cause-sensitive emotional events are explicit and never guessed.
10. All source, integration, and view tests required in Section 8.3 are green.

