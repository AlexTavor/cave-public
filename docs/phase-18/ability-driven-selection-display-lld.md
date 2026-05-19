# LLD: ability-driven selection displays

## 1. Purpose

Implement ability-driven selection display rendering for resource, body, swarm, and job cards.

This design replaces card-type-specific, raw-state rendering with shared display primitives and ability-owned display contracts.

The implementation must:
- honor authored visibility and authored labels for Storage
- extract Health into a shared display component and use it in `BodyCardContent` and `SwarmRowItem`
- replace the current job yield/rate display with cycle-driven job details
- add explicit next-cycle display support for Conversion
- preserve the existing architectural rules: UI renders, logic stays in pure helpers/selectors/services, and runtime state remains the single source of truth

## 2. Why

### 2.1 Current resource display is reading the wrong contract

`ResourceCard.tsx` currently renders `resolveNumericStateEntries(entity)`.

`resolveNumericStateEntries`:
- reads arbitrary numeric state
- excludes only `progress`
- has no concept of authored visibility
- has no concept of authored labels
- has no concept of bars, icons, or tooltips

This is incompatible with the authored Storage ability contract.

### 2.2 Storage visibility is authored, but the card ignores it

`storageCompiler.ts` already uses the Storage ability’s `visible` field to decide whether to append a display bar.

`ResourceCard.tsx` bypasses that and renders raw numeric state instead.

Result: a storage with `visible: false` can still appear in the card.

### 2.3 The compiler drops authored storage labels

`storageCompiler.ts` appends storage bars with `label: resource`.

`StorageAbilityConfig` already has `displayName`.

Result: authored storage naming is lost even when the ability provides it.

### 2.4 Health UI is duplicated

`BodyCardContent.tsx` and `swarm/SwarmRowItem.tsx` each hand-roll the health row and health bar.

The compiler already defines the health bar at the ability/compiler layer through `appendBodyHealthBar` in `bodyCompilerBar.ts`.

Result: duplicated UI, inconsistent future evolution, and no shared tooltip/icon/title/bar contract.

### 2.5 Job output display is rate-based, but the request is cycle-based

`JobCard.tsx` currently renders `YieldDisplay` from `analyzeJobStatus`.

That path is built around:
- per-second yields
- mutate-flow bucketing
- a conversion whitelist

The requested display is different:
- time to next cycle
- cycle progress bar
- what happens at the end of the next cycle
- icon + text + value for each outcome
- smart tooltip for each outcome

### 2.6 Current job countdown logic is based on stale assumptions

There are two repo inconsistencies that must not be carried forward:
- `YieldDisplay.tsx` formats time using a hardcoded `16ms` per tick
- `runtimeConstants.ts` defines `LOGIC_STEP_MS = 20`

The new countdown must use `LOGIC_STEP_MS`.

### 2.7 Current job cycle progress lookup is incomplete

`jobAnalysis.ts` only searches `display.bars` for `state.progress` or `progress`.

Cycle jobs are compiled with `state.cycle` via `cycleCompilerBar.ts`.

Result: cycle progress and countdown are not modeled from the actual cycle bar contract.

## 3. Scope

### 3.1 In scope

- resource card display driven by compiled Storage bars
- health display extraction and reuse
- job cycle progress display
- job next-cycle outcome display
- explicit Conversion display within job next-cycle outcomes
- selection lens change for resource entities so resource matching is ability-driven
- compiler fix for storage label and storage visible flag propagation
- test updates required by the above contract

### 3.2 Out of scope

The following are explicitly not part of this LLD:
- changes to `FaceCard`
- changes to `AbsorptionCard`
- changes to rendering of arbitrary non-compiler-owned behavior rules
- display of `sys_cycle_reset` as a user-facing outcome
- display of nested `draft.onComplete` actions as next-cycle outcomes
- any new schema fields
- any refactor outside the files listed below

`draft.onComplete` is out of scope because it runs after the user resolves the triggered draft, not at cycle completion.

## 4. Design principles

### 4.1 Cards are containers; abilities own display content

Cards remain layout shells.

Ability display primitives and ability-owned resolvers determine what is rendered.

### 4.2 Reuse existing contracts and mechanisms

The implementation must reuse:
- compiled `display.bars`
- compiled `behavior.rules`
- compiled state entries such as `vals_prod_*` and `vals_conv_*`
- `SmartTooltip`
- `FillBar`
- `GameIcon`
- `useEntityBarRef`
- existing selection helpers where applicable

No new display schema is introduced.

### 4.3 Logic stays out of `.tsx`

All non-trivial resolution logic must live in pure `.ts` helpers or selectors.

`.tsx` files only:
- receive already-resolved models or plain props
- render existing atoms/molecules
- do trivial prop-to-view mapping only

### 4.4 The user-visible contract is compiled, not guessed

For Storage and Health, the display source is the compiled display/state contract.

For Job next-cycle outcomes, the display source is compiler-owned rule/state output:
- `sys_produce_*`
- `sys_convert_*`
- `sys_draft_*`
- `sys_cycle_transition`

No generic inference from unrelated rules is allowed.

## 5. Display contracts

## 5.1 `AbilityBarModel`

Responsibility: the canonical render model for any tooltip-wrapped bar display.

Fields:
- `id`: stable render/binding id
- `entityId`: runtime entity id for `useEntityBarRef`
- `valuePath`: live value binding path
- exactly one of:
  - `maxPath`
  - `maxValue`
- `current`: numeric current value used for initial render
- `max`: numeric max value used for initial render
- `color`: fill color
- `iconId`: icon id passed to `GameIcon`
- `title`: visible title shown in the bar header
- `valueText`: visible `[current/max]` text
- `tooltipTitle`: tooltip heading text
- `tooltipLines`: tooltip body lines in display order
- `height`: bar height; default contract is `6`

Rules:
- `valuePath` must always point to the numeric live value, not the object wrapper
- `current` and `max` must be the same values represented by `valuePath` and `maxPath`/`maxValue`
- `valueText` must be preformatted by the resolver; rendering components do not format domain values

## 5.2 `AbilityEffectModel`

Responsibility: the canonical render model for any tooltip-wrapped next-cycle effect row.

Fields:
- `id`: stable render id
- `iconId`: icon id; never empty
- `label`: effect subject text
- `valueText`: visible value text
- `tone`: one of `positive`, `negative`, `neutral`
- `tooltipTitle`: tooltip heading text
- `tooltipLines`: tooltip body lines in display order

Rules:
- every row must have an icon
- positive gains use `positive`
- resource costs use `negative`
- unlock/transform rows use `neutral`

## 5.3 `AbilityEffectGroup`

Responsibility: a titled section of effect rows.

Fields:
- `id`: stable section id
- `kind`: one of `production`, `conversion`, `draft`, `transform`
- `sourceIndex`: optional authored/compiler index for title enrichment
- `title`: fallback section title
- `effects`: ordered `AbilityEffectModel[]`

Rules:
- display order is the same order returned by the resolver
- empty groups must not be rendered

## 6. Rendering behavior by ability

## 6.1 Storage

Source of truth:
- compiled `display.bars`
- compiled state entries created by `storageCompiler.ts`

A bar belongs to Storage only if all of the following are true:
- `bar.key` starts with `state.`
- the referenced state entry exists
- the referenced state entry contains storage metadata written by `storageCompiler.ts` (`allowDeposit`, `allowWithdraw`, or `priority`)
- the referenced state entry has `visible !== false`

Visible rendering:
- icon: the storage resource id
- title: `display.bars[].label`
- bar: `FillBar`
- value text: compact `[current/max]`
- tooltip: authored label/resource name, current/max, deposit permission, withdraw permission, priority

Ordering:
- preserve `display.bars` order

## 6.2 Health

Source of truth:
- live `body.health`
- live `body.maxHealth`
- compiled health display contract from `appendBodyHealthBar`

Visible rendering:
- icon: `health`
- title: `Health`
- bar: `FillBar`
- value text: whole-number `[current/max]`
- tooltip: `Health`, current value, max value

Usage:
- `BodyCardContent`
- `SwarmRowItem`

## 6.3 Cycle

Source of truth:
- compiled cycle bar `state.cycle`
- live `state.cycle.value`
- live `state.cycle.max`
- live `powerSink.allocatedDraw`
- `LOGIC_STEP_MS`

Cycle current/max:
- current = `state.cycle.value`
- max = `state.cycle.max` or the cycle bar’s `maxKey` target

Cycle delta per tick:
- sum the finite numeric values in `powerSink.allocatedDraw.body`, `.mind`, `.social`
- multiply the sum by `LOGIC_STEP_MS / 1000`

Ticks remaining:
- if current/max are invalid, return `null`
- if delta per tick is `<= 0`, return `null`
- otherwise return `(max - current) / deltaPerTick`, clamped at zero minimum

Visible rendering:
- icon: `activity`
- title: `Cycle`
- bar: `FillBar`
- value text: compact `[current/max]`
- visible countdown line directly under the bar
- tooltip: cycle title, current/max, countdown text

Countdown format:
- must use `LOGIC_STEP_MS`
- must not hardcode `16ms`
- visible text must be human-readable duration, not raw ticks
- formatting contract:
  - under one second: milliseconds
  - one second and above: seconds with one decimal if needed

## 6.4 Production

Source of truth:
- compiled rules with id prefix `sys_produce_`
- live amount state referenced by the rule action

Display rule:
- one section titled `Production`
- one effect row per production rule with a positive amount

Effect row contract:
- icon: produced resource id
- label: produced resource id
- value text: `+<amount>`
- tone: `positive`
- tooltip:
  - `Produced on cycle completion`
  - target information
  - if target is transfer-backed, show the configured transfer target
  - if target is self, show `Stored on self`

Duplicate prevention:
- a production rule that mutates self and transfers externally still renders one row only
- the row represents the produced resource amount, not both the mutate and transfer actions separately

## 6.5 Conversion

Source of truth:
- compiled rules with id prefix `sys_convert_`
- live amount state referenced by the rule actions

Display rule:
- one section per conversion rule
- section order follows compiler/rule order

Section title:
- if the authored conversion ability id at the same index exists, is non-blank, and is not `default`, use it
- otherwise use `Conversion`

Effect row contract:
- for each `SUB self.state.<resource>.value` action:
  - icon: resource id
  - label: resource id
  - value text: `-<amount>`
  - tone: `negative`
  - tooltip title: `Consumed on cycle completion`
- for each `ADD self.state.<resource>.value` action:
  - icon: resource id
  - label: resource id
  - value text: `+<amount>`
  - tone: `positive`
  - tooltip title: `Produced on cycle completion`

Ignored actions:
- `SET self.state.cycle.value = 0` is not user-facing and must not render as an effect row

## 6.6 Draft

Source of truth:
- compiled rules with id prefix `sys_draft_`
- `TRIGGER_DRAFT` action payload

Display rule:
- one section titled `Draft`
- one row per draft trigger rule

Effect row contract:
- icon: `unknown`
  - rationale: `DraftAbilityConfig` and `DraftPoolBlueprintSchema` do not provide a deterministic icon field for the pool trigger itself
- label: `action.label` if non-blank, otherwise `action.poolId`
- value text:
  - `x<count>` when count is greater than one
  - `Unlock` when count is one or absent
- tone: `neutral`
- tooltip:
  - `Unlocks draft on cycle completion`
  - pool id
  - count

Not displayed:
- nested `onComplete` actions

## 6.7 Cycle transform

Source of truth:
- compiled rule id `sys_cycle_transition`
- `PATCH_BLUEPRINT` action payload

Display rule:
- one section titled `Transform`
- one row per transition rule

Effect row contract:
- icon:
  - target blueprint `components.display.display_key` if resolvable from the loaded cartridge
  - otherwise `unknown`
- label:
  - target blueprint `components.display.label` if resolvable
  - otherwise target blueprint id
- value text: `Transform`
- tone: `neutral`
- tooltip:
  - `Transforms on cycle completion`
  - target blueprint id

## 7. File-by-file implementation specification

## 7.1 Added files

### `src/ui/runtime/world/selection/ability-display/abilityDisplay.types.ts`

Responsibility:
- define `AbilityBarModel`
- define `AbilityEffectModel`
- define `AbilityEffectGroup`

Logic:
- no runtime logic
- pure type and contract definitions only

Interface:
- exports the three canonical display model types used by all new display components

### `src/ui/runtime/world/selection/ability-display/abilityDisplay.utils.ts`

Responsibility:
- pure helpers shared by the new ability display resolvers

Logic:
- resolve numeric values from entity paths
- normalize bar keys to explicit value/max paths
- build compact and whole-number display strings
- build human-readable countdown text using `LOGIC_STEP_MS`
- resolve the tail resource key from `state.<resource>` paths

Interface:
- pure exported functions only
- no React imports
- no runtime mutation

### `src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.tsx`

Responsibility:
- render one tooltip-wrapped bar from an `AbilityBarModel`

Logic:
- use `useEntityBarRef` to bind the bar fill to live runtime state
- render `SmartTooltip`
- render `FillBar` with icon, title, and preformatted value text
- render tooltip title and tooltip lines in order

Interface:
- prop: `model: AbilityBarModel`
- prop: optional tooltip placement override

### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.styles.ts`

Responsibility:
- visual layout for effect rows

Logic:
- define row, label, value, and section spacing styles only

Interface:
- exports styled primitives used only by `AbilityEffectList.tsx`

### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.tsx`

Responsibility:
- render one titled list of tooltip-wrapped effect rows from `AbilityEffectModel[]`

Logic:
- render section title when provided
- render each effect row with icon, label, and value text
- wrap each row in `SmartTooltip`
- apply tone-based text coloring

Interface:
- props:
  - `title?: string`
  - `effects: AbilityEffectModel[]`

### `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`

Responsibility:
- derive visible storage bar models from compiled entity display/state data

Logic:
- scan `display.bars`
- keep only storage-owned bars using the storage metadata test defined in section 6.1
- read current/max from the live entity
- build `AbilityBarModel[]` in bar order

Interface:
- input: `RuntimeEntity`
- output: `AbilityBarModel[]`
- pure function

### `src/ui/runtime/world/selection/ability-display/StorageAbilityDisplay.tsx`

Responsibility:
- render all visible Storage bars for a resource entity

Logic:
- call `resolveStorageAbilityBars(entity)`
- render one `AbilityBarDisplay` per returned model
- render nothing when the resolved list is empty

Interface:
- props:
  - `entity: RuntimeEntity`

### `src/ui/runtime/world/selection/ability-display/HealthAbilityDisplay.tsx`

Responsibility:
- render the shared health bar display used by body and swarm surfaces

Logic:
- build one `AbilityBarModel` from the provided `entityId`, `current`, and `max`
- render `AbilityBarDisplay`

Interface:
- props:
  - `entityId: string`
  - `current: number`
  - `max: number`
  - `testId?: string`

Rules:
- the component does not decide whether health should exist; it only renders the provided health display

### `src/ui/runtime/world/selection/job-card/CycleAbilityDisplay.tsx`

Responsibility:
- render the cycle bar and the visible countdown line for `JobCard`

Logic:
- receive already-computed current/max/ticksRemaining
- build one `AbilityBarModel`
- render `AbilityBarDisplay`
- render the visible countdown line only when `ticksRemaining` is not `null`

Interface:
- props:
  - `entityId: string`
  - `current: number | null`
  - `max: number | null`
  - `ticksRemaining: number | null`

### `src/ui/runtime/world/selection/job-card/NextCycleEffectsDisplay.tsx`

Responsibility:
- render the next-cycle sections for `JobCard`

Logic:
- receive ordered `AbilityEffectGroup[]`
- enrich transform icons/labels from runtime blueprint display data when available
- enrich conversion section titles from authored conversion ids when available
- render one `AbilityEffectList` per non-empty group

Interface:
- props:
  - `entity: RuntimeEntity`
  - `runtime: Runtime | null`
  - `groups: AbilityEffectGroup[]`

## 7.2 Changed files

### `src/engine/compiler/abilities/storageCompiler.ts`

Responsibility after change:
- keep compiled storage state and display bars aligned with authored storage configuration

Required logic changes:
- propagate authored visibility into `components.state[resource].visible`
- when appending a display bar, use authored `displayName` when non-blank; otherwise use `resource`
- keep existing color generation and bar order unchanged

Interface impact:
- no signature change
- output contract changes:
  - state visibility becomes authoritative
  - display bar label becomes authored when provided

### `src/ui/runtime/world/selection/selectionUtils/entity.ts`

Responsibility after change:
- continue to resolve blueprint-backed selection metadata
- additionally expose blueprint lookup needed by next-cycle transform and conversion title enrichment

Required logic changes:
- export the blueprint lookup helper instead of keeping it file-private
- add a helper that resolves a blueprint by explicit blueprint id from `runtime.getCartridge().blueprints`

Interface impact:
- new exported helper(s)
- no change to existing helper behavior

### `src/ui/runtime/world/selection/selectionUtils.ts`

Responsibility after change:
- barrel-export the new selection utility helper(s)
- stop exporting `resolveNumericStateEntries`

Interface impact:
- consumers of `resolveNumericStateEntries` must be migrated

### `src/ui/runtime/world/selection/ResourceCard.tsx`

Responsibility after change:
- render resource display strictly from Storage display models

Required logic changes:
- remove `resolveNumericStateEntries` usage entirely
- keep the existing title and description behavior
- replace the raw stat rows with `StorageAbilityDisplay`
- empty state text becomes `No visible storage.` when no storage bars resolve

Interface impact:
- none

### `src/ui/runtime/world/selection/body/BodyCardContent.tsx`

Responsibility after change:
- use the shared health display instead of a hand-rolled health row and progress bar

Required logic changes:
- remove the standalone `Health` stat row
- remove the direct `ProgressBar` usage
- render `HealthAbilityDisplay` using `data.subjectId`, `data.liveHealth`, and `data.liveMaxHealth`
- keep all other content unchanged

Interface impact:
- none

### `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

Responsibility after change:
- use the shared health display instead of a hand-rolled progress bar

Required logic changes:
- replace direct `ProgressBar` usage with `HealthAbilityDisplay`
- keep row identity, status icons, XP, attributes, and tooltip body unchanged

Interface impact:
- none

### `src/ui/runtime/world/selection/selectionLensMap.ts`

Responsibility after change:
- resolve the resource lens from Storage-owned display output, not arbitrary numeric state

Required logic changes:
- delete `resolveNumericStateEntries` usage
- `isResourceEntity(entity)` must call `resolveStorageAbilityBars(entity)` and return true only when at least one visible storage bar resolves
- priority order remains unchanged

Interface impact:
- none

### `src/ui/runtime/world/selection/job-card/jobAnalysis.types.ts`

Responsibility after change:
- define the cycle-driven job analysis contract

Required logic changes:
- replace the old yield/rate-oriented result shape
- new result fields:
  - `cycleCurrent: number | null`
  - `cycleMax: number | null`
  - `ticksRemaining: number | null`
  - `nextCycleGroups: AbilityEffectGroup[]`

Interface impact:
- all old `yields`, `conversions`, and `losses` consumers must be removed

### `src/ui/runtime/world/selection/job-card/jobAnalysis.ts`

Responsibility after change:
- analyze job display data for cycle-driven rendering

Required logic changes:
- stop computing per-second yield buckets
- resolve the cycle bar from `state.cycle`
- compute countdown using `powerSink.allocatedDraw` and `LOGIC_STEP_MS`
- sort relevant behavior rules by `sortKey`
- build ordered `nextCycleGroups` from compiler-owned rules only:
  - `sys_produce_*`
  - `sys_convert_*`
  - `sys_draft_*`
  - `sys_cycle_transition`
- ignore all other rules

Interface impact:
- existing callers must consume the new shape

### `src/ui/runtime/world/selection/jobCardSelectors.ts`

Responsibility after change:
- expose the new live cycle-driven job analysis snapshot

Required logic changes:
- `selectJobAnalysis` returns the new `JobAnalysisResult`
- `analysisComparer` compares:
  - `cycleCurrent`
  - `cycleMax`
  - `ticksRemaining`
  - serialized `nextCycleGroups`

Interface impact:
- none beyond the changed analysis shape

### `src/ui/runtime/world/selection/job-card/JobCard.tsx`

Responsibility after change:
- render cycle progress and next-cycle outcomes instead of yield/rate buckets

Required logic changes:
- keep title, description, `PowerMatrix`, `ReservoirList`, traits, and throttle behavior unchanged
- remove `YieldDisplay`
- render `CycleAbilityDisplay`
- render `NextCycleEffectsDisplay`
- continue to use live selector output with the static-analysis fallback pattern only if needed by the existing component structure

Interface impact:
- none

### `src/ui/runtime/world/selection/job-card/YieldDisplay.styles.ts`

Responsibility after change:
- remain as the section-title style source used by the new next-cycle section rendering

Required logic changes:
- keep `SectionBlock` and `SectionTitle`
- remove any styling that is only relevant to the deleted yield-rate row contract

Interface impact:
- no new exports required

## 7.3 Removed files

The following files are obsolete after the design change and must be removed.

### `src/ui/runtime/world/selection/selectionUtils/stateEntries.ts`

Reason:
- raw numeric-state dumping is no longer part of the selection display contract

### `src/ui/runtime/world/selection/job-card/YieldDisplay.tsx`

Reason:
- the card no longer renders yield/rate buckets

### `src/ui/runtime/world/selection/job-card/jobAnalysis.external.ts`
### `src/ui/runtime/world/selection/job-card/jobAnalysis.flows.ts`
### `src/ui/runtime/world/selection/job-card/jobAnalysis.mutate.ts`
### `src/ui/runtime/world/selection/job-card/jobAnalysis.whitelist.ts`

Reason:
- these files exist only to infer the old per-second yield/conversion/loss model
- that model is replaced by compiler-owned next-cycle outcome rendering

## 8. Test plan

All tests must follow the existing test standards:
- behavior-focused
- human-readable
- Given / When / Then structure
- no UI business-logic assertions in view tests

## 8.1 Unit tests

### `src/engine/compiler/abilities/storageCompiler.test.ts`

Add tests:
- compiled storage bar label uses `displayName` when authored
- compiled state entry visibility is `false` when authored `visible` is `false`
- compiled state entry visibility remains `true` when authored `visible` is omitted or `true`

### `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts`

Add tests:
- resolves only storage-owned display bars
- ignores non-storage bars
- ignores storage entries with `visible: false`
- preserves bar order
- uses compiled bar label and color

### `src/ui/runtime/world/selection/job-card/jobAnalysis.test.ts`

Rewrite the file to cover the new contract:
- cycle current/max are read from `state.cycle`
- ticks remaining uses `powerSink.allocatedDraw` and `LOGIC_STEP_MS`
- `sys_produce_*` yields one positive production row
- `sys_convert_*` yields one conversion section with negative inputs and positive outputs
- `sys_draft_*` yields a draft row with `Unlock` or `x<count>`
- `sys_cycle_transition` yields a transform row
- `sys_cycle_reset` does not render an effect row
- unrelated rules are ignored

### `src/ui/runtime/world/selection/jobCardSelectors.test.ts`

Add or update tests:
- comparer returns false when countdown changes
- comparer returns false when next-cycle groups change
- comparer returns true for equivalent analysis payloads

## 8.2 View tests

### `src/ui/runtime/world/selection/ability-display/AbilityBarDisplay.test.tsx`

Add tests:
- renders icon, title, value text, and `FillBar`
- wraps content in `SmartTooltip`
- binds the fill ref through `useEntityBarRef`

### `src/ui/runtime/world/selection/ability-display/AbilityEffectList.test.tsx`

Add tests:
- renders icon, label, and value text for each effect
- renders section title when provided
- wraps each row in `SmartTooltip`

### `src/ui/runtime/world/selection/ResourceCard.test.tsx`

Rewrite/update tests:
- renders storage bars, not raw numeric stat rows
- does not render hidden storage entries
- renders authored storage label from `displayName`
- keeps blueprint description rendering unchanged

### `src/ui/runtime/world/selection/body/BodyCard.test.tsx`

Update tests:
- body card renders `HealthAbilityDisplay`
- old standalone health row is absent
- proxy body path still renders health display correctly

### `src/ui/runtime/world/selection/swarm/SwarmRowItem.test.tsx`

Update tests:
- swarm row renders shared health display
- tooltip body still contains the full body card content

### `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`

Rewrite/update tests:
- renders cycle bar and visible countdown
- renders production section
- renders conversion section
- renders draft section when present
- renders transform section when present
- keeps throttle slider behavior unchanged

### `src/ui/runtime/world/selection/selectionLensMap.resource.test.ts`

Add tests:
- an entity with visible storage bars resolves to `resource`
- an entity with numeric state but no storage bars does not resolve to `resource`

## 9. Acceptance criteria

Implementation is complete only when all of the following are true:
- `ResourceCard` renders only Storage-owned visible bars
- storage `visible` is honored end-to-end
- storage `displayName` is honored end-to-end
- `BodyCardContent` and `SwarmRowItem` use the same shared health display component
- `JobCard` shows cycle progress and a visible time-to-next-cycle line
- `JobCard` shows next-cycle sections for Production, Conversion, Draft, and Transform when present
- every visible bar and every visible effect row is wrapped in `SmartTooltip`
- no business logic remains in the modified `.tsx` files beyond trivial prop-to-view mapping
- obsolete raw-state and rate-yield display files are removed
- all updated and new tests are green

## 10. Implementation order

The implementation order is locked:

1. compiler alignment
   - `storageCompiler.ts`
2. shared display primitives
   - `abilityDisplay.types.ts`
   - `abilityDisplay.utils.ts`
   - `AbilityBarDisplay.tsx`
   - `AbilityEffectList.*`
3. storage path
   - `resolveStorageAbilityBars.ts`
   - `StorageAbilityDisplay.tsx`
   - `ResourceCard.tsx`
   - `selectionLensMap.ts`
4. health path
   - `HealthAbilityDisplay.tsx`
   - `BodyCardContent.tsx`
   - `SwarmRowItem.tsx`
5. job path
   - `jobAnalysis.types.ts`
   - `jobAnalysis.ts`
   - `jobCardSelectors.ts`
   - `CycleAbilityDisplay.tsx`
   - `NextCycleEffectsDisplay.tsx`
   - `JobCard.tsx`
6. delete obsolete files
7. update and add tests

No phase reordering is allowed.
