# LLD: ability-driven selection display follow-up fixes

## 1. Purpose

Resolve three concrete defects in the current implementation of ability-driven selection display rendering:

1. Storage bars do not resolve for flyweight-selected entities because the resolver reads `entity.display`, but selected runtime entities do not carry `display`.
2. Job cards do not render explicit predicted next-cycle outcome lines, and Conversion sections do not render explicit conversion-rate lines.
3. Adding `worldPresence` from Designer Mode seeds invalid draft data and fails validation/save because `radius` is left undefined.

This document is a delta LLD for the current repository state. It is grounded in the code that currently exists, not in the prior planning document.

## 2. Source basis

This design is based on direct inspection of the current implementation in these files:

- `src/engine/runtime/handlers/spawnCloneUtils.ts`
- `src/engine/runtime/handlers/SpawnHandler.ts`
- `src/engine/runtime/persistence/flyweightPersistence.ts`
- `src/ui/runtime/world/useSelectedEntity.ts`
- `src/ui/runtime/world/selection/selectionUtils/entity.ts`
- `src/ui/runtime/world/selection/selectionUtils.ts`
- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`
- `src/ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx`
- `src/ui/runtime/world/selection/ResourceCard.tsx`
- `src/ui/runtime/world/selection/selectionLensMap.ts`
- `src/ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`
- `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.ts`
- `src/ui/runtime/world/selection/ability-display/AbilityEffectList.tsx`
- `src/ui/runtime/world/selection/ability-display/AbilityEffectList.styles.ts`
- `src/ui/runtime/world/selection/job-card/jobAnalysis.ts`
- `src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts`
- `src/ui/runtime/world/selection/job-card/jobAnalysis.rules.ts`
- `src/ui/runtime/world/selection/job-card/resolveNextCycleEffectGroups.ts`
- `src/ui/runtime/world/selection/job-card/NextCycleEffectsDisplay.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.tsx`
- `src/ui/runtime/world/selection/jobCardSelectors.ts`
- `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts`
- `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsWorldPresenceDraft.ts`
- `src/data/schemas/abilities/worldPresence.ts`
- `src/data/schemas/v2/spatial.ts`
- `src/ui/devtools/editors/utils/schemaDefaults.ts`

## 3. Non-goals

The following are explicitly out of scope:

- changing flyweight persistence rules in `STATEFUL_KEYS`
- copying `display` or `behavior` onto every runtime entity at spawn time
- introducing new schema fields
- changing compiler rule ids or compiler output structure
- refactoring unrelated selection-card code
- changing save/validation infrastructure outside the files listed below

The required fixes must reuse the existing flyweight model, existing blueprint lookup utilities, existing job-analysis pipeline, existing display atoms, and the existing `ensureWorldPresenceDraft(...)` mechanism.

## 4. Architectural constraints

The implementation must satisfy the project contract already in force:

- UI `.tsx` files remain render-only.
- Non-trivial resolution logic stays in pure `.ts` helpers.
- Runtime state remains the single source of truth for live numeric values.
- Blueprint flyweight data is read through existing runtime cartridge lookup, not copied into redundant local state.
- Tests remain behavior-focused and human-readable.

## 5. Issue 1 — Storage bars fail for flyweight-selected entities

### 5.1 Why this fails today

`useSelectedEntity()` returns the raw runtime entity from `runtime.getEntities()`. Spawn and hydrate both construct those entities from `cloneStatefulComponents(...)`, and `STATEFUL_KEYS` excludes `display`. As a result, selected runtime entities commonly have `state`, `physics`, `body`, `powerSink`, and similar live components, but not `display`. `resolveStorageAbilityBars(...)` currently reads `(entity as { display?: { bars?: any[] } }).display?.bars` directly, so it resolves an empty list for flyweight-selected entities even when the blueprint owns valid compiled storage bars. `ResourceCard` and `selectionLensMap` both depend on that resolver, so the same defect breaks both rendering and lens classification.

### 5.2 What must change

Storage-bar resolution must become runtime-aware and must resolve display data from the authoritative flyweight source when it is absent on the live entity.

The authoritative resolution order is locked:

1. `entity.display` when present
2. `runtime.getCartridge().blueprints[entity.blueprintId]?.components.display`
3. `undefined`

No other fallback path is allowed.

### 5.3 How it must be implemented

#### `src/ui/runtime/world/selection/selectionUtils/entity.ts`

Responsibility after change:
- expose reusable flyweight-aware lookup helpers for selection rendering

Required logic:
- add `resolveEntityDisplay(entity, runtime)`
- `resolveEntityDisplay` returns the live entity display when present
- otherwise it returns the blueprint `components.display` for `entity.blueprintId`
- otherwise it returns `undefined`
- add `resolveEntityBehavior(entity, runtime)` in the same file because the job-card fix in Issue 2 requires the same flyweight pattern

Interface:
- new export: `resolveEntityDisplay(entity: RuntimeEntity, runtime: Runtime | null): Record<string, unknown> | undefined`
- new export: `resolveEntityBehavior(entity: RuntimeEntity, runtime: Runtime | null): Record<string, unknown> | undefined`
- existing helper behavior is unchanged

#### `src/ui/runtime/world/selection/selectionUtils.ts`

Responsibility after change:
- barrel-export the new flyweight-aware helpers

Interface:
- export `resolveEntityDisplay`
- export `resolveEntityBehavior`
- no removals

#### `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`

Responsibility after change:
- resolve visible storage bars from live state plus flyweight-aware display lookup

Required logic:
- change the function signature to accept `runtime`
- obtain bars exclusively from `resolveEntityDisplay(entity, runtime)`
- keep the existing storage-entry metadata test exactly as-is: a storage entry is one that contains `allowDeposit`, `allowWithdraw`, or `priority`
- keep live numeric reads from the runtime entity only
- keep bar order unchanged
- keep the current tooltip fields unchanged unless a current field is invalid
- return an empty list when no display bars exist or no qualifying visible storage entries exist

Interface:
- old: `resolveStorageAbilityBars(entity)`
- new: `resolveStorageAbilityBars(entity, runtime)`

Rules:
- the resolver remains pure
- the resolver must not mutate `entity`, `runtime`, or blueprint data
- the resolver must not infer storage bars from raw state in the absence of compiled `display.bars`

#### `src/ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx`

Responsibility after change:
- render storage bars using the runtime-aware resolver

Required logic:
- accept `runtime`
- call `resolveStorageAbilityBars(entity, runtime)`
- render `AbilityBarDisplay` exactly as today

Interface:
- old props: `{ entity: RuntimeEntity }`
- new props: `{ entity: RuntimeEntity; runtime: Runtime | null }`

#### `src/ui/runtime/world/selection/ResourceCard.tsx`

Responsibility after change:
- render storage content correctly for flyweight-selected entities

Required logic:
- call `resolveStorageAbilityBars(entity, runtime)` for the empty-state decision
- pass both `entity` and `runtime` to `StorageAbilityDisplay`
- keep title and description resolution unchanged
- keep the empty-state message text `No visible storage.` unchanged

Interface:
- no prop change; `runtime` is already available in `SelectionCardProps`

#### `src/ui/runtime/world/selection/selectionLensMap.ts`

Responsibility after change:
- classify resource entities from the same flyweight-aware storage contract used by the card

Required logic:
- change `isResourceEntity` to accept `runtime`
- call `resolveStorageAbilityBars(entity, runtime)`
- return `true` only when the resolver yields at least one visible bar
- keep lens priority order unchanged

Interface:
- `LENS_MAP` entry signatures remain unchanged because `SelectionLens.match` already receives `(entity, runtime)`

### 5.4 Acceptance criteria for Issue 1

Issue 1 is complete only when all of the following are true:

- a selected entity with flyweight-only `display.bars` resolves storage bars correctly
- `selectionLensMap` classifies that entity as `resource`
- hidden storage entries remain hidden
- entities with numeric state but without compiled storage bars do not classify as `resource`
- no runtime persistence or spawn code is changed

## 6. Issue 2 — Job card is missing predicted outcome lines and conversion-rate lines

### 6.1 Why this fails today

The current job-card pipeline has two separate gaps.

First, flyweight lookup is incomplete. `jobAnalysis.cycle.ts` looks for the cycle bar on `entity.display?.bars`, and `jobAnalysis.rules.ts` reads rules from `entity.behavior?.rules`. The selected runtime-entity path is flyweight-backed, and spawn/hydrate do not copy either `display` or `behavior`. That means job analysis is currently tied to richer test fixtures rather than to the real selected-entity contract.

Second, even when rules are available, the display model has no concept of predicted section headers. `AbilityEffectGroup` only carries `title` and `effects`. `resolveNextCycleEffectGroups(...)` only enriches conversion titles and transform labels/icons. `AbilityEffectList.tsx` only renders the section title and detailed effect rows. There is therefore no place in the current contract to render lines such as:

- produced outcome in the next cycle ETA
- draft/unlock ETA
- transform ETA
- conversion input-to-output rate line

### 6.2 What must change

The job-card pipeline must become runtime-aware and must produce explicit display-group header lines that are derived from:

- compiler-owned next-cycle effect groups
- the resolved countdown text for the current cycle
- existing runtime blueprint metadata for transform and conversion enrichment

No inference from unrelated rules is allowed. The existing rule whitelist remains authoritative.

### 6.3 Display contract additions

#### `AbilityInlineDisplayToken`

Responsibility:
- represent one renderable inline fragment inside a compact header line

Fields:
- `kind`: `text` or `icon`
- `text`: required when `kind` is `text`
- `iconId`: required when `kind` is `icon`

Rules:
- tokens render strictly in array order
- text tokens are preformatted strings; the view does not synthesize words or punctuation

#### `AbilityInlineDisplayLine`

Responsibility:
- represent one compact header line shown above the detailed effect rows

Fields:
- `id`: stable render id
- `tokens`: ordered `AbilityInlineDisplayToken[]`
- `tooltipTitle`: optional tooltip heading
- `tooltipLines`: optional tooltip body lines in order

Rules:
- a line may contain multiple icons
- the line is fully resolved before it reaches `.tsx`
- the line is optional; sections without compact headers remain valid

#### `ResolvedAbilityEffectGroup`

Responsibility:
- represent the fully enriched job-card section model used by the view layer

Fields:
- `id`: stable section id
- `title`: visible section title
- `headerLines`: ordered `AbilityInlineDisplayLine[]`
- `effects`: ordered `AbilityEffectModel[]`

Rules:
- `headerLines` render before `effects`
- `effects` remain the detailed, tooltip-rich breakdown
- header lines are supplementary, not replacements for effect rows

### 6.4 Header-line rendering rules

The formatting rules are locked.

#### Countdown text

The countdown formatter in `abilityDisplay.utils.ts` must be upgraded and reused for both the cycle bar and section header lines.

Formatting contract:
- below 1 second: integer milliseconds, `N ms`
- 1 second up to 60 seconds: seconds, one decimal only when needed, `N s` or `N.N s`
- 60 seconds up to 60 minutes: minutes, one decimal only when needed, `N m` or `N.N m`
- 60 minutes and above: hours, one decimal only when needed, `N h` or `N.N h`

The formatter must continue to use `LOGIC_STEP_MS`. No hardcoded tick length is allowed.

#### Production header lines

For each positive production effect row:
- render one compact header line
- line format: `<amount> <icon> <label> in <countdown>`
- amount comes from the effect row’s positive amount, without the `+` prefix
- icon and label come from the effect row
- countdown comes from the resolved countdown formatter

If countdown is unavailable, no production header line is rendered.

#### Draft header lines

For each draft effect row:
- render one compact header line
- line format: `<label> in <countdown>` when the row value is `Unlock`
- line format: `<valueText> <label> in <countdown>` when the row value is multiplicative, for example `x2`

If countdown is unavailable, no draft header line is rendered.

#### Transform header lines

For each transform effect row:
- render one compact header line
- line format: `Transform to <icon> <label> in <countdown>`
- icon and label are the enriched transform icon/label, not the raw blueprint id when enrichment succeeds

If countdown is unavailable, no transform header line is rendered.

#### Conversion header lines

Each conversion section renders up to two compact header lines, in this exact order:

1. predicted output line
2. conversion-rate line

Predicted output line:
- use the positive conversion effect rows only
- line format for a single positive row: `<amount> <icon> <label> in <countdown>`
- line format for multiple positive rows: join output segments with ` + ` and append `in <countdown>` once at the end
- if countdown is unavailable, this line is omitted

Conversion-rate line:
- use negative rows as inputs and positive rows as outputs
- join same-side segments with ` + ` in effect order
- place a single text token ` -> ` between input and output sides
- do not append countdown text to this line
- example structure: `<amount> <icon> <label> -> <amount> <icon> <label>`

If either side is empty, the conversion-rate line is omitted.

### 6.5 How it must be implemented

#### `src/ui/runtime/world/selection/selectionUtils/entity.ts`

Responsibility after change:
- provide the flyweight-aware behavior lookup used by job analysis

Required logic:
- `resolveEntityBehavior(entity, runtime)` returns `entity.behavior` when present
- otherwise returns blueprint `components.behavior`
- otherwise returns `undefined`

This helper is shared with Issue 1 and must not be duplicated elsewhere.

#### `src/ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`

Responsibility after change:
- define the compact header-line contracts used by enriched job-card sections

Required logic:
- add `AbilityInlineDisplayToken`
- add `AbilityInlineDisplayLine`
- add `ResolvedAbilityEffectGroup`
- keep existing `AbilityEffectModel` and `AbilityEffectGroup` definitions intact

Interface:
- existing types remain source models for analysis
- new types are display models for enriched rendering

#### `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.ts`

Responsibility after change:
- continue to host pure formatting helpers for ability displays

Required logic:
- extend `formatCountdownText(...)` to support seconds, minutes, and hours as defined above
- do not change any unrelated formatting helper contract

Interface:
- function name remains `formatCountdownText`
- return type remains `string | null`

#### `src/ui/runtime/world/selection/job-card/jobAnalysis.ts`

Responsibility after change:
- expose runtime-aware job analysis for flyweight-selected entities

Required logic:
- change the function signature to accept `runtime`
- pass `runtime` to the cycle-status resolver and rule resolver
- keep the output shape `JobAnalysisResult`

Interface:
- old: `analyzeJobStatus(entity)`
- new: `analyzeJobStatus(entity, runtime)`

#### `src/ui/runtime/world/selection/job-card/jobAnalysis.cycle.ts`

Responsibility after change:
- resolve cycle-bar data from live state plus flyweight-aware display lookup

Required logic:
- change the resolver signature to accept `runtime`
- use `resolveEntityDisplay(entity, runtime)` to locate the cycle bar
- keep live cycle current/max reads from the runtime entity state
- keep tick-delta logic based on `powerSink.allocatedDraw`
- keep the current invalid-data behavior: return `null` values when inputs are invalid

Interface:
- old: `resolveJobCycleStatus(entity)`
- new: `resolveJobCycleStatus(entity, runtime)`

#### `src/ui/runtime/world/selection/job-card/jobAnalysis.rules.ts`

Responsibility after change:
- resolve next-cycle groups from flyweight-aware behavior lookup

Required logic:
- change the resolver signature to accept `runtime`
- use `resolveEntityBehavior(entity, runtime)` instead of `entity.behavior`
- keep the current rule whitelist exactly unchanged
- keep current `sortKey` ordering unchanged
- keep group-building delegation to `jobAnalysis.effectBuilders.ts`

Interface:
- old: `resolveNextCycleGroups(entity)`
- new: `resolveNextCycleGroups(entity, runtime)`

#### `src/ui/runtime/world/selection/job-card/resolveNextCycleEffectGroups.ts`

Responsibility after change:
- turn raw next-cycle groups into fully enriched display groups

Required logic:
- change the function signature to accept `ticksRemaining`
- continue to enrich conversion section titles from authored conversion ids
- continue to enrich transform labels/icons from blueprint display metadata
- build `headerLines` exactly according to section 6.4
- return `ResolvedAbilityEffectGroup[]`
- do not change the underlying `effects` ordering or contents

Interface:
- old: `(entity, runtime, groups) => AbilityEffectGroup[]`
- new: `(entity, runtime, groups, ticksRemaining) => ResolvedAbilityEffectGroup[]`

Rules:
- the function remains pure
- it must not re-read live numeric amounts from blueprint data; live amounts already exist in `effects`
- it must not create header lines for empty groups

#### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.styles.ts`

Responsibility after change:
- style compact header lines for effect sections

Required logic:
- add styled primitives for header-line row layout and token spacing
- keep existing effect-row styles unchanged unless a change is required for spacing consistency

Interface:
- export the new header-line styled primitives used by `AbilityEffectList.tsx`

#### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.tsx`

Responsibility after change:
- render enriched section header lines and detailed effect rows

Required logic:
- accept optional `headerLines`
- render header lines after the section title and before the detailed effect rows
- render icon tokens with `GameIcon`
- render text tokens as plain text in the given order
- wrap a header line in `SmartTooltip` only when tooltip data is present
- keep existing effect-row rendering unchanged

Interface:
- old props: `{ title?: string; effects: AbilityEffectModel[] }`
- new props: `{ title?: string; headerLines?: AbilityInlineDisplayLine[]; effects: AbilityEffectModel[] }`

#### `src/ui/runtime/world/selection/job-card/NextCycleEffectsDisplay.tsx`

Responsibility after change:
- pass countdown-aware enriched section models to the shared list renderer

Required logic:
- accept `ticksRemaining`
- call `resolveNextCycleEffectGroups(entity, runtime, groups, ticksRemaining)`
- pass `headerLines` through to `AbilityEffectList`

Interface:
- old props: `{ entity; runtime; groups }`
- new props: `{ entity; runtime; groups; ticksRemaining }`

#### `src/ui/runtime/world/selection/jobCardSelectors.ts`

Responsibility after change:
- expose a runtime-aware selector factory for job analysis and keep comparison logic isolated

Required logic:
- replace the unary `selectJobAnalysis(entity)` export with `createJobAnalysisSelector(runtime)`
- the factory returns a unary selector compatible with `useEntitySelector`
- keep `analysisComparer(...)` unchanged except for adapting to any imported type path changes

Interface:
- old: `selectJobAnalysis(entity): JobAnalysisResult`
- new: `createJobAnalysisSelector(runtime): (entity) => JobAnalysisResult`

#### `src/ui/runtime/world/selection/job-card/JobCard.tsx`

Responsibility after change:
- render runtime-aware cycle analysis plus compact next-cycle header lines

Required logic:
- obtain the live selector via `createJobAnalysisSelector(runtime)`
- pass that selector to `useEntitySelector(...)`
- keep the existing static fallback, but call `analyzeJobStatus(entity, runtime)`
- pass `analysis.ticksRemaining` to `NextCycleEffectsDisplay`
- keep title, description, power matrix, reservoir list, traits, and throttle behavior unchanged

Interface:
- no prop change

### 6.6 Acceptance criteria for Issue 2

Issue 2 is complete only when all of the following are true:

- job analysis works for flyweight-selected entities whose `display` and `behavior` live only on the blueprint
- cycle countdown still uses `LOGIC_STEP_MS`
- production, draft, and transform sections render compact predicted-outcome header lines when countdown is available
- conversion sections render both a predicted-output header line and a conversion-rate header line when the required rows exist
- detailed effect rows remain visible under those compact lines
- no business logic is moved into `.tsx`

## 7. Issue 3 — Adding `worldPresence` creates invalid draft data

### 7.1 Why this fails today

`useDesignerAbilities.ts` uses `getDefaultValue(abilitySchemas[ability])` for single abilities that do not have an explicit special-case draft factory. `worldPresence` currently takes that generic path. `getDefaultValue(...)` returns `{}` for object schemas whose `safeParse(undefined)` does not yield a concrete object. `WorldPresenceAbilitySchema` requires `radius`, and `radius` itself is a nested object. The result is that adding `worldPresence` writes an incomplete object to `_editor.abilities.worldPresence`. Validation then runs against that incomplete object and fails at `_editor.abilities.worldPresence.radius`, matching the reported save error.

The repository already contains the correct normalization mechanism: `ensureWorldPresenceDraft(...)` in `blueprintVisualsWorldPresenceDraft.ts`. That helper seeds `x`, `y`, and a fully parsed `radius` draft using existing blueprint state plus schema defaults. The current bug exists because Designer Mode does not reuse that helper.

### 7.2 What must change

Adding `worldPresence` must use the existing `ensureWorldPresenceDraft(...)` path instead of the generic schema-default path.

No schema change is required.

### 7.3 How it must be implemented

#### `src/ui/devtools/editors/blueprint/mode/useDesignerAbilities.ts`

Responsibility after change:
- add single abilities using the correct ability-specific initialization path

Required logic:
- import `ensureWorldPresenceDraft(...)`
- add a dedicated `worldPresence` branch in `addAbility(...)`
- when `ability === "worldPresence"`, call `ensureWorldPresenceDraft(draft, blueprintId)` and return immediately
- keep the existing explicit branches for `cycle`, `conditionalActivation`, and `injection`
- keep the generic `getDefaultValue(...)` path for all other single abilities

Interface:
- no exported interface change

Rules:
- the add flow must remain idempotent for already-present single abilities
- the world-presence add path must not duplicate literal default objects that already exist in schema/helper code
- the add path must continue to work when spatial or physics coordinates already exist on the blueprint

#### `src/ui/devtools/editors/blueprint/visuals/blueprintVisualsWorldPresenceDraft.ts`

Responsibility after change:
- unchanged

Required logic:
- no functional changes unless a test exposes a real defect in the existing helper

This helper is already the correct source of truth and must be reused, not replaced.

### 7.4 Acceptance criteria for Issue 3

Issue 3 is complete only when all of the following are true:

- adding `worldPresence` creates a draft object with `x`, `y`, and `radius`
- `radius` includes concrete `min` and `max` values and the optional ref fields in their schema-valid state
- saving immediately after adding `worldPresence` does not produce the reported validation error
- no changes are made to `WorldPresenceAbilitySchema`

## 8. Test plan

All tests must follow the project testing standards:

- behavior-focused
- Given / When / Then structure
- logic tested in pure-unit tests where possible
- view tests limited to rendering and wiring

### 8.1 Unit tests

#### `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts`

Add coverage for:
- flyweight entity with bars on blueprint display resolves visible storage correctly
- live-entity display still takes precedence when present
- hidden storage remains hidden under flyweight lookup
- entities without compiled bars still return an empty list

#### `src/ui/runtime/world/selection/job-card/jobAnalysis.test.ts`

Update coverage for:
- cycle current/max resolve correctly when the cycle bar exists only on blueprint display
- next-cycle groups resolve correctly when behavior exists only on blueprint components
- existing rule filtering and ordering remain unchanged

#### `src/ui/runtime/world/selection/job-card/resolveNextCycleEffectGroups.test.ts`

Add a new pure-unit test file covering:
- production header-line generation from effect rows plus countdown
- conversion predicted-output line generation
- conversion-rate line generation
- transform label/icon enrichment plus transform header-line generation
- omission of header lines when countdown is unavailable

#### `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.test.ts`

Add a new pure-unit test file covering:
- milliseconds formatting
- seconds formatting
- minutes formatting
- hours formatting
- invalid/null countdown handling

#### `src/ui/runtime/world/selection/jobCardSelectors.test.ts`

Update coverage for:
- selector-factory output still compares equivalent payloads as equal
- comparer still invalidates when countdown changes
- comparer still invalidates when next-cycle groups change

#### `src/ui/devtools/editors/blueprint/mode/DesignerMode.abilities.test.tsx`

Add coverage for:
- adding `worldPresence` renders the form without crashing
- the stored draft includes a concrete `radius` object immediately after add

### 8.2 View tests

#### `src/ui/runtime/world/selection/ResourceCard.test.tsx`

Update coverage for:
- flyweight-selected resource entity renders authored storage bars from blueprint display
- empty-state behavior remains unchanged when no bars resolve

#### `src/ui/runtime/world/selection/selectionLensMap.resource.test.ts`

Update coverage for:
- flyweight-selected entity with blueprint-owned storage bars resolves to `resource`
- numeric-state-only entity still does not resolve to `resource`

#### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.test.tsx`

Update coverage for:
- header lines render before detailed effect rows
- icon and text tokens render in order
- header-line tooltip rendering is wired when tooltip data is present

#### `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`

Update coverage for:
- flyweight-backed job data renders cycle analysis correctly
- compact predicted-outcome header lines are visible
- conversion-rate line is visible
- detailed sections remain visible under the compact lines
- throttle behavior remains unchanged

#### `src/ui/devtools/editors/blueprint/editor/BlueprintEditorValidation.test.tsx`

Add coverage for:
- a blueprint with newly added `worldPresence` does not show the validation error caused by missing `radius`

## 9. Implementation order

Implementation order is locked:

1. add flyweight-aware selection helpers
2. fix storage-bar resolution and resource lens classification
3. make job analysis runtime-aware
4. add compact header-line display contract and rendering
5. wire predicted-outcome and conversion-rate lines into the job card
6. route Designer Mode world-presence add through `ensureWorldPresenceDraft(...)`
7. update unit tests
8. update view tests

No phase reordering is allowed.

## 10. Final acceptance criteria

The full change is complete only when all of the following are true:

- flyweight-selected resource entities render storage bars correctly
- resource lens classification matches the storage-bar contract
- job-card cycle analysis works for flyweight-selected entities
- job cards render explicit predicted-outcome header lines where countdown and effect data exist
- conversion sections render explicit conversion-rate lines in addition to predicted-output lines
- adding `worldPresence` produces schema-valid draft state immediately
- all affected tests are green
- no runtime persistence model, no compiler schema, and no unrelated editor behavior is changed
