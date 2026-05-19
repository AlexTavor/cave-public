# LLD — Guidance, Hard Tutorial Orchestration, Generic Callout Layer, and Thought/Tutorial Deprecation

## Why

The current authored/runtime split is no longer sufficient for the onboarding you want to ship.

Today the codebase has three separate pieces that overlap but do not compose:

- **Thoughts**: fullscreen, blocking narrative modal flow (`src/game/systems/ThoughtSystem.ts`, `src/ui/runtime/thoughts/*`).
- **Tutorials**: condition-driven ongoing notification + modal preview flow (`src/ui/runtime/tutorials/*`, `src/ui/runtime/notifications/*`).
- **Node overlays**: local, node-attached telemetry labels (`src/ui/runtime/world/node-overlays/*`).

That split blocks the desired tutorial design:

- hard tutorial steps must orchestrate **multiple guidance instances**;
- guidance must support **node-attached**, **screen-position**, and **modal** presentation;
- tutorial steps must be able to **pause**, **hide chrome**, **focus entities**, **block interaction**, **show rings**, and **retry**;
- the screen must use **one generic callout layer** with multiple producers;
- old Thoughts and old authored Tutorials must disappear cleanly, with only the useful underlying machinery retained.

The current code already contains the right building blocks and they must be reused, not replaced:

- single-source-of-truth runtime + command pipeline;
- structured condition schema/compiler/evaluator;
- world selection synchronization and camera state plumbing;
- node-overlay world-to-screen projection and pooled viewport pattern;
- editor session/update patterns, `ComponentRow`, `SmartTooltip`, and structured-condition field rows;
- runtime notification stack for non-guidance ongoing/events.

This LLD keeps those mechanisms and replaces only the parts that no longer fit.

---

## What

This change introduces four authored/runtime concepts.

### 1. Guidance

A reusable authored object that defines **presentation** and **local behavior**, but not hard-tutorial progression.

A Guidance owns:

- `id`
- presentation subtype
- authored content for that subtype
- attention preset
- enter condition refs
- completion condition refs

A Guidance does **not** own:

- retry
- hard tutorial step order
- hard tutorial step progression state
- codex unlock rules

### 2. Tutorial

A hard-tutorial wrapper that owns **explicit ordered step progression**.

A Tutorial owns:

- ordered steps
- current step progression state in runtime
- step-level target binding for each guidance use
- optional step-level enter/exit overrides
- optional step-level retry config
- merged attention plan for the active step

A Tutorial does **not** own:

- authored condition definitions
- guidance presentation definitions

### 3. Knowledge Entry

A codex wrapper over a single Guidance.

A Knowledge Entry owns:

- `key`
- `guidanceId`
- unlock condition refs
- codex button label

Runtime codex browsing UI is **not** implemented in this LLD. The authored schema/editor is implemented now so the data model is stable and the old tutorial/thought modal assets can be migrated into Guidance immediately.

### 4. Generic Callout Layer

A runtime UI layer that renders:

- node-attached telemetry labels
- node-attached tutorial/guidance callouts
- screen-position tutorial/guidance callouts

This layer is generic and has multiple producers. It owns:

- viewport projection
- slot resolution
- callout-vs-callout collision avoidance
- rendering order

It does **not** own tutorial logic or condition evaluation.

---

## Scope and non-goals

### In scope

- authored Guidance definitions
- authored hard Tutorial wrappers
- authored Knowledge entries
- authored reusable Condition objects by id
- hard tutorial runtime progression
- tutorial attention control
- generic callout viewport
- modal Guidance rendering
- removal of Thoughts and old authored Tutorials
- migration of existing sample data and editor routes

### Explicitly out of scope

- a full codex browser UI next to the menu
- fly-to-codex-button animation
- generalized non-tutorial guidance scheduler beyond what the modal renderer and data model need
- changes to gameplay rules outside the tutorial hook-up points already discussed
- unrelated refactors or tech-debt cleanup

---

## Existing mechanisms that must be reused

### Runtime / engine

Reuse directly:

- `src/data/schemas/conditions.ts`
- `src/engine/compiler/conditions/compileStructuredConditions.ts`
- `src/game/conditions/evaluateStructuredConditionSet.ts`
- runtime command + handler registration pattern in `src/game/main.ts`
- world-owned blocking overlay pause semantics in `src/engine/runtime/runtimePauseState.ts`
- selection sync in `src/ui/runtime/world/context/useSyncRuntimeSelection.ts`
- camera state plumbing in `src/ui/runtime/world/context/GameWorldAdapter.tsx` and `src/ui/runtime/state/cameraSlice.ts`

### Runtime UI

Reuse directly:

- `src/ui/runtime/world/node-overlays/nodeOverlayPosition.ts`
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts`
- `src/ui/runtime/status/useRuntimeClock.ts`
- `src/ui/runtime/notifications/*` for non-guidance notifications only
- `src/ui/runtime/world/context/WorldInteractionContext.tsx`
- `src/engine/phaser/hooks/usePhaserGame.ts`
- `src/engine/phaser/display/*` module-stack pattern

### Editors

Reuse directly:

- `src/ui/devtools/editors/config/tutorials/*` session/form/editor structure as the basis for new Guidance/Tutorial/Knowledge editors
- `src/ui/devtools/editors/config/thoughts/*` for modal-content editing patterns
- `src/ui/devtools/editors/conditions/*` for structured condition row editing
- `src/ui/lib/atoms/component-row/*`
- `src/ui/lib/atoms/tooltip/SmartTooltip.tsx`
- `src/ui/devtools/state/useSessionStore.ts` update pattern

---

## Canonical authored data model

All authored data lives under `config.settings` in the `.cave` fragment.

### `config.settings.conditions`

Top-level array of reusable condition definitions.

Each element is one fixed condition object with a stable `id` and `sortKey`.

This reuses the current structured-condition schema file and editor field sets. The conditions are no longer embedded inside authored Thoughts/Tutorials.

### `config.settings.guidances`

Top-level array of Guidance definitions.

Guidance presentation subtypes:

- `node_callout`
- `screen_callout`
- `modal`

### `config.settings.tutorials`

Top-level array of hard Tutorial wrappers.

Runtime activates tutorials in authored array order. Only one hard tutorial may be active at once.

### `config.settings.knowledge`

Top-level array of Knowledge entries.

Each entry wraps exactly one Guidance and contains codex metadata only.

### Removed authored paths

Delete completely:

- `config.settings.thoughts`
- old `config.settings.tutorials` shape (`body`, `gifUrl`, `startConditions`, `endConditions`)

---

## Canonical runtime model

Runtime truth remains on `sys_world`.

### New component: `tutorial`

Add a new world-owned runtime component at `sys_world.tutorial`.

Responsibility:

- explicit hard tutorial progression state
- resolved active step bindings
- active step merged attention plan
- step timer anchor for retry
- completion marker

Canonical fields:

- `active: boolean`
- `tutorialId: string | null`
- `stepIndex: number`
- `stepStartedAtGameSeconds: number | null`
- `primaryTargetId: string | null`
- `bindings: TutorialGuidanceBinding[]`
- `attention: ResolvedTutorialAttentionPlan`
- `completed: boolean`

`TutorialGuidanceBinding` is runtime-resolved and frozen for the active step:

- `guidanceId: string`
- `targetId: string | null`
- `textOverride: string | null`

`ResolvedTutorialAttentionPlan` is runtime-authored output, not UI-derived:

- `hideNotifications: boolean`
- `hideTimeControls: boolean`
- `pauseGame: boolean`
- `focusEntityIds: string[]`
- `ringEntityIds: string[]`
- `cameraFocusEntityId: string | null`
- `blockNonFocusedInteraction: boolean`

### Removed component: `thought`

Delete `sys_world.thought` entirely.

The old thought modal path is replaced by Guidance modal rendering.

---

## Canonical condition model

## Storage

Condition definitions remain in `src/data/schemas/conditions.ts`.

The file is extended, not replaced.

### Supported condition families after this change

Keep existing kinds:

- `fact_threshold`
- `world_state_threshold`
- `entity_tag_present`
- `world_state_boolean`

Add new Guidance-specific kinds:

- `self_selected`
- `self_unselected`

Subtype restriction rules:

- `self_*` kinds are valid only where a target exists.
- Guidance-local `self` binds to the guidance target.
- Step override / retry `self` binds to the step primary target.
- If no target exists, editor blocks authoring, compiler rejects, runtime logs loudly.

### Evaluation semantics

- Guidance enter/exit condition refs resolve to authored condition definitions by id.
- Step overrides, when present, **replace** guidance enter/exit refs.
- If a step has no exit override, its completion condition is the **AND** of the referenced guidances’ completion conditions.
- A Guidance with no completion refs evaluates completion as **true**.

### Invalid step semantics

If a step is invalid at runtime for any reason (missing required guidance, unresolved required target, broken subtype/condition pairing, missing primary target for step-level `self`, etc.), the system must:

1. log a loud runtime error,
2. mark the step complete,
3. advance the tutorial immediately.

No skip state is persisted. This is intentionally simple.

---

## Canonical tutorial step model

A tutorial step is an authored object with exactly these fields:

- `guidances`: ordered array of step guidance uses
- `enterConditionIds?`: optional array of condition ids, replacing all guidance enter conditions for this step
- `exitConditionIds?`: optional array of condition ids, replacing all guidance completion conditions for this step
- `primaryTarget?`: optional target spec used only by step-level `self` conditions and retry
- `retry?`: optional retry config

Each guidance use is:

- `guidanceId: string`
- `target?`: optional target spec (`entity_id` or `entity_tag`)
- `text?`: optional plain-text override

### Target resolution

Target resolution happens **once on step activation** and is then frozen into `sys_world.tutorial.bindings`.

Resolution rules:

- `entity_id` must resolve to an existing runtime entity id.
- `entity_tag` resolves to the first matching entity in stable entity-id ascending order.
- if the target is optional and resolution fails, `targetId = null`
- if the target is required by the guidance subtype or by a referenced `self_*` condition and resolution fails, the step is invalid and completes immediately with a loud log

### Step ordering

Step internal order is the authored array order.

That order is used for:

- deterministic guidance binding resolution
- deterministic callout placement precedence
- deterministic attention merge precedence when a single-target choice is required

---

## Retry model

Retry is a **Tutorial Step** property only.

A step retry config contains:

- `delayGameSeconds: number`
- `progressField: string`
- `operator: one of >, >=, ==, <=, <`
- `value: number`
- `reenterStep: boolean` — must always be `true` in this implementation; the field exists only to make the behavior explicit in authored data and tests

Semantics:

- retry timer starts when the step becomes active
- timer uses simulated game time
- timer stops while paused
- timer is affected by timescale
- timer resets only when the step is re-entered
- when the retry predicate becomes true after the delay, the tutorial re-enters the same step from scratch
- re-entry re-resolves all bindings, rewrites `sys_world.tutorial`, reapplies the step attention plan, and restarts the step timer

---

## Attention model

Attention is compositional but rendered from presets.

### Guidance-owned preset

Each Guidance stores a preset enum.

Implement exactly these presets now:

- `none`
- `focus_blocking`
- `focus_blocking_hide_time_controls`
- `focus_non_blocking`
- `modal_blocking`
- `screen_non_blocking`

No authored custom attention matrix is added in this phase.

### Tutorial merge rules

Tutorial owns merge of the active step’s guidances.

Merge rules are fixed and deterministic:

- `hideNotifications`: OR across active guidance presets
- `hideTimeControls`: OR across active guidance presets
- `pauseGame`: OR across active guidance presets
- `blockNonFocusedInteraction`: OR across active guidance presets
- `focusEntityIds`: union, in step array order, de-duped preserving first occurrence
- `ringEntityIds`: exactly equal to `focusEntityIds`
- `cameraFocusEntityId`: first entity id in `focusEntityIds`, or `null`

Tutorial writes the fully merged result into `sys_world.tutorial.attention`.

The UI never recomputes the attention plan from authored Guidance data.

### Render-time effects

The merged attention plan drives:

- notification viewport visibility
- time-controls visibility
- play/pause side effects
- non-focused entity interactivity gating
- entity fade in Phaser
- entity attention rings in Phaser
- camera focus animation

---

## Generic callout layer

## Responsibilities

The generic callout layer replaces the node-overlay viewport and renders all DOM callouts.

It must support two anchor domains:

- **entity-attached** callouts
- **screen-slot** callouts

It must render multiple producer streams in one layer:

- telemetry/node overlays
- tutorial/guidance callouts

## Slot model

### Entity-attached callout slots

Implement these ordered slots:

- `top`
- `top_right`
- `right`
- `bottom_right`
- `bottom`
- `bottom_left`
- `left`
- `top_left`

A node-callout Guidance definition stores an ordered slot preference list.

### Screen-position callout slots

Implement these fixed screen slots:

- `top_left`
- `top_right`
- `bottom_left`
- `bottom_right`
- `center`

A screen-callout Guidance definition stores exactly one screen slot.

## Placement algorithm

1. Each producer emits a list of callout candidates.
2. All guidance callout candidates are concatenated in tutorial step array order.
3. Telemetry callout candidates are appended after tutorial/guidance candidates.
4. For each candidate in order:
   - resolve its preferred anchor rect
   - if it does not overlap already placed rects and is inside viewport, place it
   - otherwise try the next allowed slot for that candidate
   - if no slot is collision-free, place it in its first authored slot anyway
5. No pushing, quadtree search, force-directed layout, or hiding is done in v1.

The placement engine only handles **callout-vs-callout** collision.
It does not attempt to avoid wires, particles, selection cards, or world art.

## API

The generic runtime interface is:

- `RuntimeCalloutCandidate`
  - `source: "guidance" | "telemetry"`
  - `key: string`
  - `anchor: entity anchor spec or screen anchor spec`
  - `slotPreferences: ordered slots`
  - `content: render-ready text/bar/image refs`
  - `priority: number`

The generic viewport API is:

- a hook that returns already-laid-out `ResolvedRuntimeCallout[]`
- a viewport that renders those callouts in one overlay root

Producer add/remove API is **not a mutable runtime registry**.
It is a pure resolver pipeline:

- telemetry producer resolver
- tutorial/guidance producer resolver
- merge resolver
- layout resolver

That keeps the logic deterministic and testable.

---

## Modal guidance rendering

The old fullscreen Thought modal and the old tutorial image/text modal are unified into one modal renderer.

Rules:

- modal Guidance content is authored on the Guidance definition itself
- step text override is a single plain-text replacement only; it never replaces image/title structure
- modal Guidance rendering is driven by active tutorial step bindings in this phase
- future codex opening will reuse the same renderer

The modal renderer is separate from notifications. The notification store no longer owns tutorial modal state.

---

## Editor model

## Top-level editors

Add these editors to the system config dashboard:

- Conditions
- Guidances
- Tutorials
- Knowledge

Remove:

- Thoughts

Keep:

- Notifications

## Conditions Editor

Uses the existing structured-condition row machinery.

Behavior:

- edits top-level `config.settings.conditions`
- one row per condition definition
- ids are user-visible and editable
- tooltip coverage on every interactive control
- invalid subtype-specific condition combinations are blocked in-editor

## Guidances Editor

Edits top-level `config.settings.guidances`.

Behavior:

- one row per guidance definition
- subtype-specific sub-editors
- tooltip coverage on every interactive control
- enter/completion conditions are selected by condition id reference, not edited inline
- modal subtype previews reuse the current `TutorialDisplay` rendering path after it is renamed into the new guidance renderer

## Tutorials Editor

Rewritten from the current authored-tutorial editor.

Behavior:

- edits hard Tutorial wrappers only
- each tutorial row contains ordered step rows
- each step row contains ordered guidance-use rows
- each guidance-use row chooses a guidance id, optional target, optional text override
- step-level overrides and retry are edited on the step row
- step primary target is optional and separate from guidance-use target

## Knowledge Editor

Edits top-level `config.settings.knowledge`.

Behavior:

- one row per knowledge entry
- each row chooses a guidance id
- each row chooses unlock condition refs
- each row edits codex button label

## Layout rule

Use the existing `ComponentRow` structure, but switch form-row flex layouts from stacked wide fields to compact single-row grouped layouts where fields are naturally short.

This is a pure editor-layout improvement. It does not change authored data shape.

---

## Migration and deletion

## One-time content migration

Perform a one-time migration of authored `.cave` data:

- old `thoughts[]` entries become `guidances[]` of subtype `modal`
- old authored `tutorials[]` entries become either:
  - `guidances[]` of subtype `modal` if the content is meant to survive as reusable knowledge, or
  - deleted outright if it was only the old notification-backed tutorial system
- old inline thought/tutorial conditions become top-level `config.settings.conditions[]`
- all references are rewritten to condition ids

No id continuity is required for old thoughts/tutorials.

## Hard cut

Delete all legacy code not reused by the new system.

There is **no** compatibility shim.

Legacy Thoughts and old authored Tutorials are removed completely after migration.

---

## How — production file plan

Production files are grouped by area. Each file listed here is either **added**, **changed**, or **deleted**.

### A. Schemas and semantic fragment plumbing

#### `src/data/schemas/conditions.ts` — **change**
**Responsibility**: canonical authored condition definition schema.

**Logic**:
- keep current fixed structured-condition object shape with `id` and `sortKey`
- add new `self_selected` and `self_unselected` kinds
- export a top-level array schema for `config.settings.conditions`
- enforce unique ids at the array level

**Interface**:
- exported condition-definition types remain plain data objects
- no runtime evaluation code lives here

#### `src/data/schemas/guidances.ts` — **add**
**Responsibility**: Guidance authored schema.

**Logic**:
- define shared guidance fields
- define discriminated presentation subtypes: `node_callout`, `screen_callout`, `modal`
- define guidance attention preset enum
- define condition-ref arrays by id
- define subtype-specific validation

**Interface**:
- exports `GuidanceDefinitionSchema`, `GuidancesSchema`, and types

#### `src/data/schemas/tutorials.ts` — **replace**
**Responsibility**: hard Tutorial wrapper schema.

**Logic**:
- replace old modal tutorial shape entirely
- define tutorial step schema, guidance-use schema, target spec schema, retry schema
- enforce unique tutorial ids
- enforce stable step array order
- validate that step override fields only reference condition ids and never embed condition objects

**Interface**:
- exports `TutorialDefinitionSchema`, `TutorialsSchema`, and types for the new wrapper only

#### `src/data/schemas/knowledge.ts` — **add**
**Responsibility**: authored codex metadata schema.

**Logic**:
- define one-entry-per-guidance wrapper
- define unlock condition refs and button label
- enforce unique knowledge keys

**Interface**:
- exports `KnowledgeEntrySchema`, `KnowledgeSchema`, and types

#### `src/data/schemas/components/tutorial.ts` — **add**
**Responsibility**: runtime world component shape for hard tutorial state.

**Logic**:
- defines exact `sys_world.tutorial` runtime data shape
- includes bindings and merged attention plan
- includes step timer anchor and completion flag

**Interface**:
- runtime component only; no behavior

#### `src/data/schemas/blueprintConfig.ts` — **change**
**Responsibility**: include new authored config collections.

**Logic**:
- remove `thoughts`
- replace old tutorial schema with new wrapper schema
- add `conditions`, `guidances`, `knowledge`

**Interface**:
- `BlueprintSettingsSchema` is the canonical top-level config shape

#### `src/engine/linker/semanticParser.ts` — **change**
**Responsibility**: parse `.cave` fragments into the new authored config shape.

**Logic**:
- remove Thoughts schema parsing
- parse top-level `conditions`, `guidances`, `tutorials`, `knowledge`

**Interface**:
- same fragment parser API, new `.cave` payload shape

#### `src/lib/modules/fragmentSerializers.ts` — **change**
**Responsibility**: serialize module data back into `.cave` fragment shape.

**Logic**:
- remove `thoughts`
- serialize `conditions`, `guidances`, `tutorials`, `knowledge`

**Interface**:
- same serializer surface

#### `src/lib/modules/semanticModuleFragments.ts` — **change**
**Responsibility**: normalize fragment input/output for the new authored config collections.

**Logic**:
- add defaults for new top-level arrays
- remove old `thoughts` mapping

**Interface**:
- same `toCaveModule` / `toSemanticFragment` API

#### `src/engine/terminal/commands/projectCartridgeAdapter.ts` — **change**
**Responsibility**: map runtime cartridge config into module cartridge config.

**Logic**:
- map new `conditions`, `guidances`, `tutorials`, `knowledge` collections
- stop mapping `thoughts`

**Interface**:
- same `toModuleCartridge` signature

#### `src/data/raw/example/modules/core.cave` — **change**
**Responsibility**: repository sample data stays canonical.

**Logic**:
- migrate sample thoughts/tutorials into the new config layout

**Interface**:
- valid authored example for editor and parser tests

#### `src/data/schemas/thoughts.ts` — **delete**
#### `src/data/schemas/components/thought.ts` — **delete**
**Reason**: obsolete authored/runtime model.

---

### B. Condition evaluation and tutorial runtime

#### `src/engine/compiler/conditions/compileStructuredConditions.ts` — **change**
**Responsibility**: compile authored condition definitions into json-logic-compatible expressions.

**Logic**:
- add compilation for `self_selected` and `self_unselected`
- continue compiling existing fact/world/tag conditions unchanged

**Interface**:
- existing compile helpers remain, with support for the new condition kinds

#### `src/game/conditions/evaluateStructuredConditionSet.ts` — **change**
**Responsibility**: evaluate a list of resolved condition definitions against a snapshot.

**Logic**:
- add optional evaluation binding input for `self`
- default behavior remains world-bound when no target binding is supplied

**Interface**:
- same base API, extended with optional binding parameter

#### `src/game/tutorials/resolveConditionRefs.ts` — **add**
**Responsibility**: map condition-id arrays to actual authored condition definitions.

**Logic**:
- resolve refs from `config.settings.conditions`
- validate existence
- emit loud runtime failure data for missing refs

**Interface**:
- pure resolver, no runtime mutation

#### `src/game/tutorials/tutorialStateUtils.ts` — **add**
**Responsibility**: get/set/clear `sys_world.tutorial` component helpers.

**Logic**:
- centralize world component mutation shape for handlers

**Interface**:
- pure helpers used by handlers and tests

#### `src/game/tutorials/resolveTutorialBindings.ts` — **add**
**Responsibility**: activate one tutorial step into runtime-resolved frozen bindings.

**Logic**:
- resolve each guidance use target once
- resolve step primary target once
- freeze bindings and return runtime-ready state
- fail loudly on invalid required target resolution

**Interface**:
- pure resolver from authored step + snapshot to runtime binding payload

#### `src/game/tutorials/resolveTutorialAttentionPlan.ts` — **add**
**Responsibility**: merge active step guidances into one attention plan.

**Logic**:
- convert each guidance preset into a partial plan
- merge by the fixed OR/union rules defined above

**Interface**:
- pure resolver from resolved guidance bindings + authored guidances to `ResolvedTutorialAttentionPlan`

#### `src/game/tutorials/resolveTutorialRetry.ts` — **add**
**Responsibility**: evaluate step retry predicates.

**Logic**:
- compare `currentGameSeconds - stepStartedAtGameSeconds`
- read configured runtime progress field on the step primary target
- return `true` only when both delay and threshold predicate are satisfied

**Interface**:
- pure resolver, no mutation

#### `src/game/systems/HardTutorialSystem.ts` — **add**
**Responsibility**: single runtime system for hard-tutorial progression.

**Logic**:
- if no tutorial is active/completed, activate the first authored tutorial in array order
- on step activation, resolve bindings and merged attention, then emit `SET_TUTORIAL_STATE`
- if step override exit conditions are present, use them
- otherwise use AND of referenced guidance completion conditions
- if step retry fires, re-enter the same step
- if a step completes, advance to the next step
- if entering a terminal step that should end hard-blocking immediately, mark tutorial completed at step activation while leaving the step’s guidances active
- if any step is invalid, log loudly and immediately advance

**Interface**:
- read-only system; emits commands only

#### `src/game/handlers/SetTutorialStateHandler.ts` — **add**
**Responsibility**: the only mutator for `sys_world.tutorial` runtime state.

**Logic**:
- apply full tutorial component payload atomically
- clear component on tutorial completion if no active bindings remain

**Interface**:
- command handler only

#### `src/engine/runtime/types/runtimeCommandPayloadsTutorial.ts` — **add**
#### `src/engine/runtime/types/runtimeCommandTutorial.ts` — **add**
#### `src/engine/runtime/types/runtimeCommandTypes.ts` — **change**
#### `src/engine/runtime/types/runtimeCommandPayloads.ts` — **change**
#### `src/engine/runtime/types/runtimeCommandUnion.ts` — **change**
#### `src/engine/runtime/types/runtimeCommandInterfaces.ts` — **change**
#### `src/engine/runtime/types.ts` — **change**
**Responsibility**: add typed runtime command support for tutorial state mutation.

**Logic**:
- add exactly one new command type: `SET_TUTORIAL_STATE`
- do not add a command explosion for every tutorial behavior

**Interface**:
- typed command payload barrel updated consistently

#### `src/engine/runtime/runtimePauseState.ts` — **change**
**Responsibility**: runtime system-phase blocking overlay gate.

**Logic**:
- stop treating `thought` as a blocker
- treat `sys_world.tutorial.attention.pauseGame === true` as blocking
- keep draft blocking unchanged

**Interface**:
- same exported helpers

#### `src/game/main.ts` — **change**
**Responsibility**: register the new system/handler set and remove legacy thought registrations.

**Logic**:
- remove `ThoughtSystem` and thought handlers
- register `HardTutorialSystem` and `SetTutorialStateHandler`

**Interface**:
- same `createGame` API

#### Legacy runtime thought files — **delete**
Delete completely:

- `src/game/thoughts/thoughtEligibility.ts`
- `src/game/thoughts/thoughtUtils.ts`
- `src/game/systems/ThoughtSystem.ts`
- `src/game/handlers/ShowThoughtHandler.ts`
- `src/game/handlers/AcknowledgeThoughtHandler.ts`
- `src/game/handlers/ClearThoughtHandler.ts`

---

### C. Runtime UI: guidance, attention, callouts, and chrome gating

#### `src/ui/runtime/guidance/useRuntimeTutorialGuidanceState.ts` — **add**
**Responsibility**: observe `sys_world.tutorial`, authored Guidance definitions, and produce render-ready modal/callout guidance models.

**Logic**:
- read tutorial component from runtime
- resolve bound guidance ids to authored definitions
- apply single plain-text override when present
- separate modal presentations from callout presentations

**Interface**:
- hook returning `{ modalGuidance, calloutGuidances, attentionPlan }`
- no mutation

#### `src/ui/runtime/guidance/GuidanceDisplay.tsx` — **add**
**Responsibility**: render modal Guidance content.

**Logic**:
- unify current thought body rendering and current tutorial image/body rendering
- modal content authored on the guidance definition
- plain text override only replaces the main text block

**Interface**:
- pure presentational component

#### `src/ui/runtime/guidance/GuidanceModalViewport.tsx` — **add**
**Responsibility**: mount the active modal Guidance in a `Modal`.

**Logic**:
- render nothing when no active modal guidance exists
- consume state only from `useRuntimeTutorialGuidanceState`
- do not own progression logic

**Interface**:
- no props; runtime-observing viewport

#### `src/ui/runtime/guidance/index.ts` — **add**
**Responsibility**: feature barrel.

#### `src/ui/runtime/attention/useRuntimeAttentionState.ts` — **add**
**Responsibility**: convert the runtime tutorial attention plan into UI-facing selectors.

**Logic**:
- expose booleans for hidden notifications/time controls
- expose allowed-focus entity id set
- expose camera focus target
- expose interaction gate predicate

**Interface**:
- hook only; no mutations

#### `src/ui/runtime/world/callouts/calloutTypes.ts` — **add**
**Responsibility**: generic callout candidate and resolved-callout types.

#### `src/ui/runtime/world/callouts/calloutSlots.ts` — **add**
**Responsibility**: canonical node and screen slot enums.

#### `src/ui/runtime/world/callouts/resolveCalloutAnchor.ts` — **add**
**Responsibility**: resolve world-attached and screen-slot anchor positions.

**Logic**:
- reuse current node overlay projection math for entity anchors
- compute fixed screen-slot origins from viewport bounds

**Interface**:
- pure function

#### `src/ui/runtime/world/callouts/resolveCalloutLayout.ts` — **add**
**Responsibility**: collision-aware slot assignment for callout candidates.

**Logic**:
- process candidates in deterministic order
- try alternate slots only
- never hide or nudge
- if all slots collide, keep the first authored slot

**Interface**:
- pure function returning resolved callout rects and final chosen slots

#### `src/ui/runtime/world/callouts/resolveCalloutEntries.ts` — **add**
**Responsibility**: merge callout producers into one ordered candidate list.

**Logic**:
- tutorial/guidance producers first
- telemetry producer second

**Interface**:
- pure function

#### `src/ui/runtime/world/callouts/useCalloutModels.ts` — **add**
**Responsibility**: runtime hook that polls viewport size, camera state, and producers, then returns resolved callouts.

**Logic**:
- reuse the existing animation-frame update pattern from node overlays
- reuse pooled fixed slot count if still needed for DOM stability

**Interface**:
- hook only

#### `src/ui/runtime/world/callouts/CalloutCard.tsx` — **add**
**Responsibility**: render one resolved callout.

**Logic**:
- render content according to source subtype
- keep telemetry bar rendering compatible with current node overlays

**Interface**:
- pure presentational component

#### `src/ui/runtime/world/callouts/CalloutViewport.tsx` — **add**
**Responsibility**: mount the generic callout layer.

**Logic**:
- one overlay root
- one render pass for all resolved callouts

**Interface**:
- no props; runtime-observing viewport

#### `src/ui/runtime/world/callouts/CalloutViewport.styles.ts` — **add**
**Responsibility**: styles for the generic callout layer.

#### `src/ui/runtime/world/callouts/index.ts` — **add**
**Responsibility**: feature barrel.

#### `src/ui/runtime/world/node-overlays/resolveNodeOverlayModel.ts` — **change**
**Responsibility**: telemetry producer model generation.

**Logic**:
- keep the current cycle/assignment/storage derivation unchanged
- return producer-level telemetry data suitable for generic callout conversion

**Interface**:
- no direct DOM/card assumptions

#### `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.ts` — **change**
**Responsibility**: telemetry producer resolver.

**Logic**:
- stop owning final DOM card layout
- emit telemetry callout candidates into the generic callout pipeline

**Interface**:
- pure producer

#### `src/ui/runtime/world/node-overlays/nodeOverlayTypes.ts` — **change**
**Responsibility**: telemetry producer types only.

**Logic**:
- remove old viewport/card-specific fields
- keep telemetry content shape only

**Interface**:
- producer types only

#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.tsx` — **delete**
#### `src/ui/runtime/world/node-overlays/NodeOverlayCard.tsx` — **delete**
#### `src/ui/runtime/world/node-overlays/useNodeOverlayModels.ts` — **delete**
#### `src/ui/runtime/world/node-overlays/NodeOverlayViewport.styles.ts` — **delete**
**Reason**: superseded by the generic callout layer.

#### `src/ui/runtime/shell/RuntimeShellCanvas.tsx` — **change**
**Responsibility**: mount the new guidance/callout viewports and gate chrome.

**Logic**:
- mount `CalloutViewport` instead of `NodeOverlayViewport`
- mount `GuidanceModalViewport`
- render notifications and time controls conditionally from `useRuntimeAttentionState`
- remove `ThoughtOverlay`
- remove old `RuntimeTutorialModal` path

**Interface**:
- same component API

#### `src/ui/runtime/notifications/runtimeNotificationTypes.ts` — **change**
**Responsibility**: notification domain types only.

**Logic**:
- remove tutorial-specific ongoing kind and modal payload types
- ongoing notifications remain only purge/hungry/cold (and future non-guidance ongoing items)

**Interface**:
- tutorial payload types disappear

#### `src/ui/runtime/notifications/runtimeNotificationStore.ts` — **change**
**Responsibility**: event notification store only.

**Logic**:
- remove `activeTutorial`
- remove tutorial modal open/close actions

**Interface**:
- simpler store state

#### `src/ui/runtime/notifications/RuntimeNotificationViewport.tsx` — **change**
**Responsibility**: notification viewport only.

**Logic**:
- stop mounting any tutorial modal

**Interface**:
- unchanged public component

#### `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.ts` — **change**
**Responsibility**: resolve ongoing notifications only.

**Logic**:
- stop resolving authored tutorials as ongoing notifications

**Interface**:
- same function signature

#### `src/ui/runtime/notifications/RuntimeNotificationOngoingList.tsx` — **change**
**Responsibility**: render ongoing notification cards.

**Logic**:
- remove tutorial clickable/open behavior
- no guidance responsibility remains here

**Interface**:
- same component API with simpler item types

#### `src/ui/runtime/status/useRuntimeClock.ts` — **change**
**Responsibility**: runtime time-control behavior.

**Logic**:
- add hidden-state awareness so spacebar does nothing when time controls are hidden by attention
- keep tutorial seen-marking logic only if the relevant knowledge/guidance later still uses it; otherwise delete the old `cave_tut_time_controls_seen` write entirely during content migration

**Interface**:
- expose the same playback/scale API plus a hidden gate input

#### `src/ui/runtime/status/RuntimeClock.tsx` — **change**
**Responsibility**: runtime time-controls view.

**Logic**:
- no business logic; just render if allowed by attention state

**Interface**:
- same component API

#### `src/ui/runtime/world/context/WorldInteractionContext.tsx` — **change**
**Responsibility**: DI surface for world interaction.

**Logic**:
- add optional entity-interaction gate predicate
- add optional attention-state read access needed by renderers/modules

**Interface**:
- context shape expanded only for DI; no mutable state is stored here

#### `src/ui/runtime/world/context/GameWorldAdapter.tsx` — **change**
**Responsibility**: bind runtime truth to world interaction DI.

**Logic**:
- derive attention state from runtime tutorial component
- wrap `selectEntity` so disallowed entity ids are ignored while non-focused interaction is blocked
- provide attention data into Phaser via context

**Interface**:
- same adapter role, expanded context payload

#### `src/engine/phaser/hooks/usePhaserGame.ts` — **change**
**Responsibility**: pass new attention-aware DI values into `GameScene`.

#### `src/engine/phaser/scenes/GameScene.ts` — **change**
**Responsibility**: carry attention state into display tick/init contexts.

#### `src/engine/phaser/display/types.ts` — **change**
**Responsibility**: add attention-state access to display module contexts.

#### `src/engine/phaser/display/EntityVisualInstance.ts` — **change**
**Responsibility**: pass attention state to display modules during init/tick.

#### `src/engine/phaser/display/modules/AttentionModule.ts` — **add**
**Responsibility**: visual fade + ring rendering for tutorial attention.

**Logic**:
- dim non-focused entities via alpha on root/background anchors
- show ring pulse for focused ids using the same graphics/tween style as `SelectionModule`
- never mutate simulation state

**Interface**:
- ordinary display module factory

#### `src/engine/phaser/display/DisplayDefinitionCatalog.ts` — **change**
#### `src/engine/phaser/display/DefaultPlaceholderDisplayDefinition.ts` — **change**
**Responsibility**: install `AttentionModule` in all relevant display stacks.

**Logic**:
- `AttentionModule` must appear before `SelectionModule` so attention and selection can co-exist visually without selection owning dimming semantics

**Interface**:
- same display-definition creation APIs

#### Legacy runtime UI feature directories — **delete**
Delete completely:

- `src/ui/runtime/thoughts/*`
- `src/ui/runtime/tutorials/*`

---

### D. Editor and route integration

#### `src/ui/devtools/editors/config/conditions/ConditionsEditor.tsx` — **add**
**Responsibility**: top-level authored condition editor.

#### `src/ui/devtools/editors/config/conditions/GuidanceConditionForm.tsx` — **add**
**Responsibility**: one condition row editor.

#### `src/ui/devtools/editors/config/conditions/useConditionsSession.ts` — **add**
**Responsibility**: session operations for top-level conditions list.

#### `src/ui/devtools/editors/config/conditions/conditionFieldSchemas.ts` — **add**
**Responsibility**: path constants and primitive zod helpers for the Conditions editor.

#### `src/ui/devtools/editors/config/guidances/GuidancesEditor.tsx` — **add**
**Responsibility**: top-level Guidance editor.

#### `src/ui/devtools/editors/config/guidances/GuidanceForm.tsx` — **add**
**Responsibility**: one Guidance definition editor.

#### `src/ui/devtools/editors/config/guidances/useGuidancesSession.ts` — **add**
**Responsibility**: session operations for top-level guidances list.

#### `src/ui/devtools/editors/config/guidances/guidanceEditorDefaults.ts` — **add**
**Responsibility**: canonical default Guidance per subtype.

#### `src/ui/devtools/editors/config/guidances/guidanceFieldSchemas.ts` — **add**
**Responsibility**: path constants and small zod helpers.

#### `src/ui/devtools/editors/config/tutorials/TutorialsEditor.tsx` — **change**
**Responsibility**: rewritten hard Tutorial wrapper editor.

#### `src/ui/devtools/editors/config/tutorials/TutorialForm.tsx` — **change**
**Responsibility**: one Tutorial wrapper editor.

#### `src/ui/devtools/editors/config/tutorials/useTutorialsSession.ts` — **change**
**Responsibility**: tutorial-wrapper list session operations.

#### `src/ui/devtools/editors/config/tutorials/tutorialEditorDefaults.ts` — **change**
**Responsibility**: canonical default hard Tutorial wrapper.

#### `src/ui/devtools/editors/config/tutorials/tutorialFieldSchemas.ts` — **change**
**Responsibility**: paths/schema helpers for the new Tutorial wrapper.

#### `src/ui/devtools/editors/config/tutorials/TutorialStepForm.tsx` — **add**
**Responsibility**: one step editor.

#### `src/ui/devtools/editors/config/tutorials/TutorialGuidanceUseForm.tsx` — **add**
**Responsibility**: one guidance-use row inside a step.

#### `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.tsx` — **add**
**Responsibility**: top-level Knowledge editor.

#### `src/ui/devtools/editors/config/knowledge/KnowledgeEntryForm.tsx` — **add**
**Responsibility**: one Knowledge entry editor.

#### `src/ui/devtools/editors/config/knowledge/useKnowledgeSession.ts` — **add**
**Responsibility**: session operations for top-level knowledge list.

#### `src/ui/devtools/editors/config/knowledge/knowledgeEditorDefaults.ts` — **add**
**Responsibility**: canonical default Knowledge entry.

#### `src/ui/devtools/editors/config/knowledge/knowledgeFieldSchemas.ts` — **add**
**Responsibility**: paths/schema helpers for Knowledge.

#### `src/ui/devtools/editors/conditions/StructuredConditionFieldSets.tsx` — **change**
**Responsibility**: reusable structured-condition field groups.

**Logic**:
- add field sets for `self_selected` / `self_unselected` if they need no extra fields, render read-only explanatory text instead of editable fields

#### `src/ui/devtools/editors/conditions/StructuredConditionRow.tsx` — **change**
**Responsibility**: reusable structured-condition row.

**Logic**:
- include new condition kinds in the kind enum
- subtype-aware tooltip text

#### `src/ui/devtools/editors/conditions/structuredConditionDefaults.ts` — **change**
**Responsibility**: default definition per condition kind.

#### `src/ui/devtools/editors/conditions/structuredConditionAutocomplete.ts` — **change**
**Responsibility**: suggestions for world-state keys and tags.

**Logic**:
- remove old tutorial-only state keys from hardcoded assumptions once migrated
- add any new tutorial component world-state keys only if still used by actual conditions

#### `src/ui/devtools/editors/conditions/ConditionRefListField.tsx` — **add**
**Responsibility**: reusable list-of-condition-id reference editor.

**Logic**:
- autocomplete from top-level authored conditions
- allow add/remove/reorder
- no inline condition editing

#### `src/ui/devtools/editors/file/SystemConfigEditor.tsx` — **change**
**Responsibility**: system config dashboard cards.

**Logic**:
- remove Thoughts card
- add Conditions, Guidances, Knowledge cards
- keep Tutorials card but point it to hard Tutorial wrappers

#### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx` — **change**
**Responsibility**: route new config editor kinds.

#### `src/ui/devtools/shell/window-manager/tabIds.ts` — **change**
#### `src/ui/devtools/shell/window-manager/virtualPath.constants.ts` — **change**
**Responsibility**: register editor routes for `conditions`, `guidances`, and `knowledge`, and remove `thoughts`.

#### Legacy editor files — **delete**
Delete completely:

- `src/ui/devtools/editors/config/thoughts/*`

Old `config/tutorials/*` files are rewritten in place, not deleted, because the route name survives.

---

## How — test plan

Tests must follow the project testing contract exactly.

### Unit tests (pure logic)

Add or update these exact unit test files:

- `src/engine/compiler/conditions/compileStructuredConditions.test.ts`
  - verifies new `self_selected` / `self_unselected` compilation
- `src/game/tutorials/resolveConditionRefs.test.ts`
  - missing ref, duplicate id map behavior, happy path
- `src/game/tutorials/resolveTutorialBindings.test.ts`
  - id target, tag target, frozen resolution, invalid required target
- `src/game/tutorials/resolveTutorialAttentionPlan.test.ts`
  - merge rules and deterministic ordering
- `src/game/tutorials/resolveTutorialRetry.test.ts`
  - simulated-time retry thresholds and primary-target progress checks
- `src/ui/runtime/world/callouts/resolveCalloutAnchor.test.ts`
  - entity anchor projection and screen-slot anchors
- `src/ui/runtime/world/callouts/resolveCalloutLayout.test.ts`
  - alternate-slot collision avoidance and fallback-to-first-slot behavior
- `src/ui/runtime/world/node-overlays/resolveNodeOverlayEntries.test.ts`
  - updated to emit telemetry callout candidates instead of direct overlay cards

### Integration tests (runtime + systems + stores)

Add or update these exact integration tests:

- `src/game/systems/HardTutorialSystem.test.ts`
  - start, advance, retry, invalid-step-complete, terminal-step behavior
- `src/game/handlers/SetTutorialStateHandler.test.ts`
  - world component mutation happy/negative paths
- `src/ui/runtime/world/context/GameWorldAdapter.test.tsx`
  - interaction gating obeys attention focus set
- `src/ui/runtime/state/useRuntimeStore.test.ts`
  - tutorial state survives reset/load semantics correctly where applicable
- `src/ui/runtime/notifications/resolveOngoingRuntimeNotifications.test.ts`
  - tutorial ongoing items are gone; only real notifications remain
- `src/engine/phaser/display/DisplayDefinitionCatalog.test.ts`
  - `AttentionModule` is present in all relevant module stacks

### View / smoke tests

Add or update these exact UI tests:

- `src/ui/runtime/guidance/GuidanceModalViewport.test.tsx`
  - modal guidance renders correct subtype content
- `src/ui/runtime/shell/RuntimeShellCanvas.callouts.test.tsx`
  - callout viewport is mounted in full chrome and not minimal chrome
- `src/ui/runtime/world/callouts/CalloutViewport.test.tsx`
  - merged callout rendering path smoke test
- `src/ui/runtime/status/RuntimeClock.test.tsx`
  - spacebar does nothing while time controls are hidden
- `src/ui/devtools/editors/config/conditions/ConditionsEditor.test.tsx`
- `src/ui/devtools/editors/config/guidances/GuidancesEditor.test.tsx`
- `src/ui/devtools/editors/config/tutorials/TutorialsEditor.test.tsx`
- `src/ui/devtools/editors/config/knowledge/KnowledgeEditor.test.tsx`
- `src/ui/devtools/shell/window-manager/WindowLayoutResolver.conditions.test.tsx`
- `src/ui/devtools/shell/window-manager/WindowLayoutResolver.guidances.test.tsx`
- `src/ui/devtools/shell/window-manager/WindowLayoutResolver.knowledge.test.tsx`

### Deleted legacy tests

Delete all tests whose only subject is legacy Thoughts or legacy authored Tutorial UI/runtime behavior, including these exact files:

- `src/ui/runtime/thoughts/ThoughtOverlay.test.tsx`
- `src/ui/runtime/tutorials/resolveRuntimeTutorials.test.ts`
- `src/ui/runtime/tutorials/RuntimeTutorialModal.test.tsx`
- `src/ui/runtime/notifications/RuntimeNotificationViewport.tutorial.cases.tsx`
- `src/ui/devtools/editors/config/thoughts/ThoughtsEditor.test.tsx`

Update, not delete:

- `src/ui/devtools/editors/config/tutorials/TutorialsEditor.test.tsx`
- `src/ui/runtime/notifications/RuntimeNotificationViewport.test.tsx`
- `src/ui/runtime/world/node-overlays/NodeOverlayViewport.test.tsx` → rename/replace with callout viewport tests
- `src/ui/runtime/shell/RuntimeShellCanvas.nodeOverlays.test.tsx` → rename/replace with callout viewport test

---

## Implementation order

This order is mandatory.

1. **Schemas + parser + serializers**
   - add new authored types
   - remove thoughts schema path
2. **Condition compiler/evaluator extension**
   - add new condition kinds and id-resolution support
3. **Runtime tutorial component + command + system + handler**
   - get hard tutorial truth into `sys_world`
4. **Generic callout layer**
   - introduce viewport and producer pipeline
   - migrate node overlays into it
5. **Attention plumbing**
   - gate notifications/time controls/interactions
   - add `AttentionModule`
6. **Guidance modal renderer**
   - unify thought/tutorial modal visuals
7. **Editor surfaces**
   - Conditions, Guidances, Tutorials, Knowledge
   - route integration
8. **Migration + deletion**
   - rewrite sample data
   - delete thoughts and old tutorial runtime/editor code
9. **Tests**
   - unit first
   - integration second
   - view/smoke last

No phase may skip ahead while leaving red tests behind.

---

## Final acceptance criteria

The implementation is complete only when all of the following are true:

- no legacy Thought runtime/editor/schema code remains
- old authored Tutorial shape no longer parses
- `config.settings.conditions`, `guidances`, `tutorials`, and `knowledge` are the only guidance-related authored config collections
- hard tutorial progression is world-owned runtime truth
- UI derives only render-ready state from runtime + authored data and does not own tutorial progression logic
- one generic callout viewport renders both telemetry and guidance callouts
- attention gating hides notifications/time controls and blocks non-focused interaction exactly as authored
- modal Guidance rendering has replaced both old thought modal and old tutorial modal behavior
- all listed tests are green
- there are no silent failures
- no out-of-scope refactors were introduced

