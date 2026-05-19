# LLD — Suspicious Activity Indicators, Tagged Producer Habitus Bonus, and Cycle Resource Costs

## Scope and governing constraints

This design is constrained by the uploaded contract documents and the inspected codebase.

Authoritative constraints applied while drafting this design:
- Blueprints remain authored structure; runtime behavior is compiled from `_editor.abilities` into runtime components and rules.
- Runtime mutation continues to flow through commands and existing behavior and passive-effect mechanisms.
- UI remains presentation and editor wiring only; business logic stays in compiler, game, runtime, or non-React helpers.
- Tests must be behavior-first, colocated, and cover happy path, negative path, and edge cases.
- Silent fallbacks are forbidden. Where behavior cannot be derived deterministically, the implementation must choose an explicit, documented fallback.

This updated scope explicitly removes the previously proposed Child Ability. Parent-on-spawn authoring is already implemented and is out of scope for this change set.

This design intentionally reuses the following existing mechanisms already present in the codebase:
- Purge progression is already advanced by authored updater abilities that target `sys_world.state.purge_progress.value`, and those updaters already support `cycle_complete` and `assignment_complete` triggers.
- Job cards already derive display-only analysis data from the runtime entity plus the cartridge blueprint and config; no card writes to simulation state.
- Game Config already mixes schema-driven editing with targeted custom editors such as `PurgeMilestonesEditor`.
- Cave-owned Habiti already feed hidden `sys_world` bonus state which production and conversion compilers already consume.
- Storage-like request behavior already exists via state entries with `allowDeposit`, `allowWithdraw`, `priority`, and `compileStorageAutoRequest(...)`.

No new runtime mutation pattern is introduced unless the existing code lacks a fit.

---

## Current code facts that this design builds on

### 1. Purge advancement is already authored through updater abilities
- `src/data/schemas/abilities/updater.ts` already supports `target`, `op`, `value`, and `triggers`.
- `src/data/schemas/abilities/triggers.ts` already defines `cycle_complete` and `assignment_complete`.
- `src/engine/compiler/abilities/updaterCompiler.ts` already compiles updater abilities into behavior rules.
- `src/data/raw/example/modules/luretraveler.bp` already advances purge with an updater targeting `sys_world.state.purge_progress.value`.
- `src/game/systems/luretravelerPurge.integration.test.ts` already proves that a cycle-based updater can advance world purge progress.

### 2. Activity cards are split into two render paths and have no generic indicator row today
- `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx` renders cycle-based activity cards.
- `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx` renders assignment-based activity cards.
- `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts` is the shared data assembly point for both card variants.
- Neither card currently has a dedicated suspicious or purge-risk badge model.

### 3. Game Config already supports custom editor composition
- `src/data/schemas/game/config.ts` owns the canonical `GameConfigSchema` and `DEFAULT_GAME_CONFIG`.
- `src/ui/devtools/editors/config/GameConfigEditor.tsx` already renders `SchemaForm` plus `PurgeMilestonesEditor`.
- `src/ui/devtools/editors/config/purge/*` already provide the local pattern for CRUD-style custom config editors backed by session draft paths.

### 4. Habitus-driven production bonus already exists end-to-end
- `src/data/schemas/game/habiti.ts` already has `add_resource_gain_multiplier`.
- `src/game/habiti/resolveOwnedHabitiEffects.ts` already aggregates Cave-owned Habiti effects.
- `src/game/habiti/enqueueResourceGainBonusStateSync.ts` already writes hidden `sys_world` state entries used by compilers.
- `src/engine/compiler/abilities/resourceGainAmountCompiler.ts` already multiplies compiled output amounts from hidden global state.
- `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainRuntime.ts` and `resourceGainTooltipLines.ts` already show bonus-origin breakdowns in job-card tooltips.

### 5. Cycle and storage machinery already cover most of cycle-cost behavior
- `src/data/schemas/abilities/cycle.ts` already owns cycle authoring.
- `src/engine/compiler/abilities/cycleCompiler.ts` already creates `state.cycle`, `powerSink`, accumulation, reset, transition, conditional activation, and optional cycle progress bars.
- `src/engine/compiler/abilities/storageCompiler.ts` and `storageAutoRequestCompiler.ts` already compile storage state and auto-request behavior.
- `src/engine/runtime/systems/behavior/targetSelector.ts` already respects storage priority and transfer permissions.
- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts` and `StorageAbilityDisplay.tsx` already render storage bars and their tooltips.

---

# Feature 1 — Suspicious activity indicators for purge-advancing activities

## Why

Purge progression is already caused by authored activities, but the runtime card gives the player no immediate signal that a selected activity is contributing to the Purge. The player currently has to infer that from authored updater data or from observing the global purge state.

The missing capability is not a new runtime system. The missing capability is a compiled marker plus a card-level display model that explains authored purge advancement using the existing card-analysis architecture.

## What

Add a compiler-authored suspicious-activity marker and a Game Config-driven card badge for any activity whose completions can advance purge progress.

### Authored contract

#### Blueprint-side authored contract
No new authored Blueprint ability is introduced.

The compiler derives suspicious activity from existing updater abilities only.

A blueprint is considered purge-suspicious when its authored abilities contain at least one updater entry that satisfies all of the following:
- `target === "sys_world.state.purge_progress.value"`
- `op === "ADD"`
- `triggers` contains `cycle_complete` or `assignment_complete`

This definition is exact. `SET` and `SUB` do not mark the blueprint as suspicious. Targets other than `sys_world.state.purge_progress.value` do not mark the blueprint as suspicious.

#### Game Config authored contract
Add a new Game Config collection named `susDisplays`.

Each entry has the exact shape:
- `text: string`
- `color: string` where the value must match `#RRGGBB`
- `threshold: number`

Selection rule:
- Compute the activity's resolved suspicious amount.
- Show the `susDisplay` whose `threshold` is the highest value less than or equal to that resolved amount.
- If multiple entries share that same threshold, the later entry in authored list order wins.
- If no entry matches, nothing is shown.

### Runtime contract

#### Compiler output contract
The compiler auto-adds the runtime tag:
- `suspicious_activity`

to the compiled blueprint tags whenever the authored contract above is satisfied.

This tag is compiler-owned. The Blueprint editor does not expose a manual authoring surface for it.

#### Card display contract
For any selected activity card:
- if the runtime entity does not have the `suspicious_activity` tag, do not render the suspicious indicator
- if the runtime entity has the tag, compute a suspicious-indicator display model from the blueprint's authored updater abilities plus `game_config.susDisplays`
- render at most one suspicious indicator on the card
- wrap that indicator in `SmartTooltip`

The display model is shared between:
- cycle activity cards rendered by `PowerJobCardView.tsx`
- assignment activity cards rendered by `AbsorptionCard.tsx`

#### Resolved suspicious amount contract
The suspicious amount is the sum of all positive resolved updater values from matching purge updaters on that blueprint.

For each matching updater entry:
- resolve its `value` through the existing UI-side action-value resolver already used by job-card analysis
- if the resolved value is finite and greater than `0`, include it in the sum
- otherwise treat that updater contribution as `0`

This rule is explicit and deterministic.

The resulting sum is the sole input to `susDisplay` threshold selection.

#### Tooltip contract
The `SmartTooltip` for the indicator must explain:
- that this activity advances Purge Progress when it completes
- whether the advancement is tied to cycle completion, assignment completion, or both
- the resolved total advancement amount when that total is greater than `0`

The tooltip text is generated by UI logic. It is not authored in Game Config.

## How

### Detection and reuse strategy
The compiler and the card-analysis layer must not each invent their own purge-updater detection rules.

Add one shared pure helper in non-UI code that:
- recognizes purge-advancing updater entries from authored abilities
- exports the compiler-owned tag constant

The compiler uses that helper to append the tag.
The card-analysis layer uses that same helper to discover the relevant authored updater entries whose values need to be resolved for display.

This keeps detection logic single-sourced and prevents future drift between compiler tagging and UI rendering.

### Compiler strategy
Do not introduce a new runtime handler, state component, or behavior rule.

The compiler change is limited to compiled tags:
- inspect authored updater abilities
- if any qualifying purge updater exists, append `suspicious_activity` to `draft.tags` if absent
- do not modify authored `_editor` content
- do not write any extra hidden state for this feature

This keeps the implementation aligned with the existing "compiler annotates the runtime blueprint" pattern already used for tags such as `storage:<resource>` and `susceptible_to_<trait>`.

### Game Config schema strategy
Extend `GameConfigSchema` with `susDisplays`.

Use the same hex-color validation pattern already used elsewhere in schemas.

`DEFAULT_GAME_CONFIG` must include `susDisplays` as a defined array.
The schema default is an empty array unless product content authors explicitly populate it.

This is deliberate. The code must not invent shipped copy or colors that are not present in the inspected repository.

### Game Config editor strategy
Add a custom `SusDisplayEditor` to `GameConfigEditor.tsx`, parallel to `PurgeMilestonesEditor`.

The editor supports CRUD for `susDisplays` entries.

Every interactive control introduced by this feature must have a `SmartTooltip`, including:
- the section heading text
- the add button
- the remove button for each row
- the row title
- the text field
- the color input
- the threshold input

The editor is responsible only for editing `config.settings.game_config.susDisplays` in session draft state.
It does not own runtime selection or validation beyond field-level schema constraints.

### Runtime card-analysis strategy
Add one display resolver that:
- reads `runtime.getCartridge().config?.settings?.game_config?.susDisplays`
- reads the selected entity's runtime tags
- reads the selected blueprint's authored updater abilities
- uses the shared detection helper to collect purge updaters
- resolves each updater value through the existing job-card action-value resolver
- sums positive resolved values
- selects the highest matching `susDisplay`
- returns a display model or `null`

That display model becomes part of the shared job-card data shape so both card variants consume the same resolved information.

### UI rendering strategy
Add one small shared pill component for the suspicious indicator.

The component receives the fully resolved display model:
- text
- color
- tooltip text

It renders no business logic.

Place the rendered indicator directly under the card title and above the narrative description so the warning is visible before the player reads the rest of the card.

No other card layout behavior changes.

## Files to add or change

### Add — `src/game/purge/suspiciousActivity.ts`
**Responsibility**: single source of truth for identifying purge-advancing authored updater entries and for the compiler-owned suspicious tag constant.

**Logic**:
- export `SUSPICIOUS_ACTIVITY_TAG`
- export the exact purge-progress target constant
- export a pure helper that filters authored updater configs down to the suspicious subset defined in this document
- do not read runtime entities, React state, or session state

**Interface**:
- `SUSPICIOUS_ACTIVITY_TAG: "suspicious_activity"`
- `collectSuspiciousPurgeUpdaters(abilities?: EditorAbilities): UpdaterAbilityConfig[]`

### Add — `src/engine/compiler/abilities/suspiciousActivityCompiler.ts`
**Responsibility**: append the compiler-owned suspicious tag to compiled blueprints.

**Logic**:
- inspect authored abilities through the shared helper
- append `suspicious_activity` to `draft.tags` if a qualifying updater exists and the tag is absent
- leave `draft.tags` unchanged otherwise
- never write behavior rules, state, or display components

**Interface**:
- `suspiciousActivityCompiler(draft: Blueprint, abilities?: EditorAbilities): void`

### Change — `src/engine/compiler/CompilerService.ts`
**Responsibility**: compiler orchestration.

**Logic**:
- import and invoke `suspiciousActivityCompiler`
- run it after authored abilities are available and before returning the compiled blueprint
- do not change any other compile ordering for this feature

**Interface**:
- no API change; compiled blueprints may now carry `suspicious_activity` in `tags`

### Add — `src/data/schemas/game/susDisplay.ts`
**Responsibility**: canonical schema for one suspicious-activity display rule.

**Logic**:
- define the exact `{ text, color, threshold }` shape
- enforce `color` as `#RRGGBB`
- keep the schema independent of React and runtime selection logic

**Interface**:
- `SusDisplaySchema`
- `SusDisplay` type

### Change — `src/data/schemas/game/config.ts`
**Responsibility**: canonical Game Config schema and defaults.

**Logic**:
- add `susDisplays: z.array(SusDisplaySchema).default([])`
- include `susDisplays` in `DEFAULT_GAME_CONFIG`
- export the resulting type through `GameConfig`

**Interface**:
- `GameConfig["susDisplays"]` becomes available everywhere config is consumed

### Change — `src/ui/devtools/editors/config/GameConfigEditor.tsx`
**Responsibility**: compose the Game Config editing surface.

**Logic**:
- render `SusDisplayEditor` alongside the existing `SchemaForm` and `PurgeMilestonesEditor`
- keep editor composition flat and explicit

**Interface**:
- no prop change

### Add — `src/ui/devtools/editors/config/suspicion/useSusDisplaysSession.ts`
**Responsibility**: session-draft access and mutations for `susDisplays`.

**Logic**:
- read `config.settings.game_config.susDisplays`
- normalize missing or object-like values into an ordered array, following the existing purge-editor session pattern
- expose `addSusDisplay()` and `removeSusDisplay(index)`
- append new rows with deterministic defaults for structure only; do not invent shipped copy beyond empty text and a valid placeholder color string required by the field schema

**Interface**:
- `useSusDisplaysSession(filename): { susDisplays, addSusDisplay, removeSusDisplay }`

### Add — `src/ui/devtools/editors/config/suspicion/SusDisplayEditor.tsx`
**Responsibility**: top-level CRUD editor for suspicious display rows.

**Logic**:
- render section copy with `SmartTooltip`
- render one row form per susDisplay entry
- render an add button wrapped in `SmartTooltip`
- delegate row editing to `SusDisplayForm`

**Interface**:
- `SusDisplayEditor({ filename }: { filename: string })`

### Add — `src/ui/devtools/editors/config/suspicion/SusDisplayForm.tsx`
**Responsibility**: edit one `susDisplay` row.

**Logic**:
- edit `text`, `color`, and `threshold`
- provide `SmartTooltip` on every interactive element
- expose row deletion through the existing `ComponentRow` pattern
- do not select displays or compute thresholds

**Interface**:
- `SusDisplayForm({ filename, index, onRemove }: Props)`

### Add — `src/ui/devtools/editors/config/suspicion/SusDisplayColorField.tsx`
**Responsibility**: dedicated hex-color editor for suspicion display rows.

**Logic**:
- edit one `#RRGGBB` string in draft state
- render a native color input plus its current hex string
- wrap the label and the input affordance in `SmartTooltip`
- do not introduce palette-linking or asset-editor behavior

**Interface**:
- `SusDisplayColorField({ filename, path, label, tooltip }: Props)`

### Add — `src/ui/runtime/world/selection/job-card/resolveSuspiciousActivityIndicator.ts`
**Responsibility**: derive the suspicious-indicator display model for a selected activity.

**Logic**:
- return `null` when the entity lacks `suspicious_activity`
- read `susDisplays` from runtime cartridge config, defaulting to `DEFAULT_GAME_CONFIG.susDisplays`
- collect qualifying authored updaters from the blueprint using the shared helper
- resolve positive contribution values with the existing `resolveActionValue(...)`
- sum contributions
- choose the highest matching display rule by threshold, breaking threshold ties in favor of later authored list position
- build tooltip text from the resolved trigger kinds and total amount

**Interface**:
- `resolveSuspiciousActivityIndicator(entity: RuntimeEntity, runtime: Runtime | null): SuspiciousActivityIndicatorModel | null`

### Add — `src/ui/runtime/world/selection/components/SuspiciousActivityIndicator.tsx`
**Responsibility**: render the suspicious pill and its `SmartTooltip`.

**Logic**:
- render nothing for `null`
- render the supplied text with the supplied color
- wrap the pill in `SmartTooltip`
- do not derive config, tags, or updater values

**Interface**:
- `SuspiciousActivityIndicator({ model }: { model: SuspiciousActivityIndicatorModel | null })`

### Add — `src/ui/runtime/world/selection/components/SuspiciousActivityIndicator.styles.ts`
**Responsibility**: pill styling for the suspicious indicator.

**Logic**:
- use theme spacing, radius, and typography
- accept resolved color as an input prop
- do not contain rendering or selection logic

**Interface**:
- styled primitives used only by `SuspiciousActivityIndicator.tsx`

### Change — `src/ui/runtime/world/selection/job-card/jobCardTypes.ts`
**Responsibility**: shared job-card data model.

**Logic**:
- add optional suspicious-indicator data to both card variants

**Interface**:
- `AssignmentJobCardData["suspiciousActivity"]`
- `PowerJobCardData["suspiciousActivity"]`

### Change — `src/ui/runtime/world/selection/job-card/resolveJobCardData.ts`
**Responsibility**: assemble the card-display model.

**Logic**:
- resolve suspicious-indicator data once for both assignment and power card variants
- do not duplicate suspicious resolution inside the render components

**Interface**:
- returned card data now includes the shared suspicious-indicator model

### Change — `src/ui/runtime/world/selection/job-card/jobCardHydration.ts`
**Responsibility**: job-card hydration dependencies and equality.

**Logic**:
- compare suspicious-indicator model as part of card equality
- keep existing hydration dependencies unchanged unless tests prove the suspicious model needs additional entity dependencies

**Interface**:
- equality semantics updated

### Change — `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
**Responsibility**: cycle activity card rendering.

**Logic**:
- render `SuspiciousActivityIndicator` in the card header stack
- do not derive suspicious display logic in this component

**Interface**:
- consumes `data.suspiciousActivity`

### Change — `src/ui/runtime/world/selection/absorption/AbsorptionCard.tsx`
**Responsibility**: assignment activity card rendering.

**Logic**:
- render `SuspiciousActivityIndicator` in the card header stack
- do not derive suspicious display logic in this component

**Interface**:
- consumes `data.suspiciousActivity`

### Change — `src/data/raw/game_data.json`
**Responsibility**: shipped default project content.

**Logic**:
- add the `susDisplays` property under `config.settings.game_config`
- the engine may ship this as `[]`
- if product wants live suspicious indicators in the shipped content, this file must also be authored with real display rows in the same implementation change set

**Interface**:
- `config.settings.game_config.susDisplays`

## Tests

### Unit tests
Add or change:
- `src/game/purge/suspiciousActivity.test.ts`
- `src/ui/runtime/world/selection/job-card/resolveSuspiciousActivityIndicator.test.ts`

Required assertions:
- only updater entries targeting `sys_world.state.purge_progress.value` with `op: "ADD"` and a cycle or assignment trigger are considered suspicious
- `SET` and `SUB` are excluded
- resolved suspicious amount sums only positive finite contributions
- highest matching threshold wins
- equal-threshold ties are resolved by later authored row order
- missing config rows return no display model

### Integration and compiler tests
Add or change:
- `src/engine/compiler/CompilerService.test.ts`
- or add `src/engine/compiler/abilities/suspiciousActivityCompiler.test.ts`

Required assertions:
- compiled blueprints gain `suspicious_activity` when qualifying updater abilities exist
- the tag is not duplicated if already present
- non-qualifying updater abilities do not add the tag
- cycle-triggered and assignment-triggered purge updaters both add the tag

### View tests
Add or change:
- `src/ui/devtools/editors/config/suspicion/SusDisplayEditor.smoke.test.tsx`
- `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`
- `src/ui/runtime/world/selection/absorption/AbsorptionCard.test.tsx`

Required assertions:
- Game Config editor renders the suspicious-display section without crashing
- add and remove affordances render and are tooltip-wrapped
- power job cards render the suspicious pill when the resolved model is present
- assignment cards render the suspicious pill when the resolved model is present
- cards render no pill when the model is `null`

---

# Feature 2 — Habitus effect: producer-output bonus by producer tag

## Why

The codebase already supports Cave-owned Habiti altering produced amounts and surfacing those origins in the job card. The missing dimension is producer identity.

The new effect must therefore extend the existing production-bonus pipeline, not create a parallel one.

## What

Add a new Habitus effect that increases produced outputs when the producing entity has a matching tag.

### Authored contract
Add a new `HabitusEffect` member with this exact shape:
- `type: "add_producer_output_multiplier"`
- `producerTag: string`
- `amount: number`
- `description: string`

### Runtime contract
If an entity produces any resource and its authored and runtime tags include `producerTag`, the final produced amount is multiplied by:
- `1 + sum(all matching resource-wide bonuses) + sum(all matching producer-tag bonuses)`

The existing resource-wide effect keeps its current semantics.

The new effect is additive with the existing one.

### Tooltip contract
Job-card production and conversion output tooltips must show:
- Base
- Total Bonuses
- Per-origin contribution lines
- Final

Origins must include both:
- resource-wide Habitus effects
- producer-tag Habitus effects

Each origin line must identify the Habitus label and the applied percentage. The authored effect description continues to appear under that contribution line.

## How

### Data aggregation
Extend the existing Cave-owned Habitus aggregation path to compute two separate bonus maps:
- `resourceGainMultipliers[resource]`
- `producerOutputTagMultipliers[tag]`

### Hidden world state sync
Continue using `UpdateCaveWithResourceGainBonusHandler` and the existing hidden-state sync flow.

Add hidden `sys_world` state for each producer-tag bonus key. This keeps runtime bonus lookup deterministic and consistent with the current resource-bonus design.

### Compiler integration
Do not compute tag bonuses in the runtime system.

Keep final output amount compilation in `resourceGainAmountCompiler.ts`, because that is already where production and conversion amounts are adjusted.

Change it so that the multiplier state becomes:
- start with resource-wide bonus from hidden world state
- add every producer-tag bonus whose tag is authored on `draft.tags`
- add `1`
- multiply the final amount by that total

This keeps all produced-amount math in one place and guarantees that production values shown in the UI are the same values used by runtime behavior.

### Tooltip integration
Extend the existing bonus-breakdown resolver so it accepts producer tags from the producing entity and reports both bonus classes in one ordered breakdown.

## Files to add or change

### Change — `src/data/schemas/game/habiti.ts`
**Responsibility**: canonical Habitus effect schema.

**Logic**:
- add discriminated-union member `add_producer_output_multiplier`
- require `producerTag`, `amount`, `description`

**Interface**:
- `HabitusEffectSchema`
- `HabitusEffect` type

### Change — `src/game/habiti/resolveOwnedHabitiEffects.ts`
**Responsibility**: aggregate owned Habiti effects into deterministic bonus structures.

**Logic**:
- continue producing existing `resourceGainMultipliers`
- additionally produce `producerOutputTagMultipliers`
- keep stable iteration order and unknown-id handling unchanged

**Interface**:
- return object gains `producerOutputTagMultipliers: Record<string, number>`

### Add — `src/game/habiti/producerOutputBonusState.ts`
**Responsibility**: shared key builders and resource-discovery helpers for producer-tag bonus hidden state.

**Logic**:
- generate stable hidden state keys from producer tags
- list all producer tags referenced by Habitus definitions
- read bonus value from `sys_world.state`

**Interface**:
- `producerOutputBonusStateKey(tag: string): string`
- `listProducerOutputBonusTags(habitusIndex): string[]`
- `readProducerOutputBonusValue(world, tag): number`

### Change — `src/game/habiti/enqueueResourceGainBonusStateSync.ts`
**Responsibility**: synchronize owned-Habiti bonus state into `sys_world.state`.

**Logic**:
- keep existing resource bonus writes
- add writes for each producer-tag bonus hidden state key
- all writes remain `visible: false`

**Interface**:
- no signature change

### Change — `src/engine/compiler/abilities/resourceGainAmountCompiler.ts`
**Responsibility**: compile final produced amount from base amount plus hidden bonus state.

**Logic**:
- continue reading resource-wide hidden bonus state
- add hidden bonus contributions for every matching authored `draft.tags` entry
- keep the same base -> multiplier -> final state derivation pattern

**Interface**:
- no signature change
- compiled passive effects include producer-tag bonus sources

### Change — `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainRuntime.ts`
**Responsibility**: resolve runtime resource-gain bonus origins for job-card display.

**Logic**:
- continue resolving resource-wide Habitus contributions
- add producer-tag contribution resolution based on entity tags and world hidden state
- preserve deterministic ordering of tooltip origins

**Interface**:
- returned origin breakdown includes producer-tag lines

### Change — `src/ui/runtime/world/selection/job-card/resourceGainTooltipLines.ts`
**Responsibility**: convert resolved bonus-origin data into tooltip text.

**Logic**:
- include producer-tag origin lines without changing the existing tooltip structure
- preserve `Base`, `Total Bonuses`, and `Final`

**Interface**:
- no signature change

### Change — `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`
**Responsibility**: Habitus effect editing UI.

**Logic**:
- add the new effect type to the type selector
- render `Producer Tag` input when the new type is selected
- all new controls must have `SmartTooltip`

**Interface**:
- existing component props unchanged

### Change — `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.test.tsx`
**Responsibility**: view-level coverage for Habitus effect authoring.

**Logic**:
- verify the new type renders the new field
- verify unrelated effect types still render their existing fields only

## Tests

### Unit tests
Add or change:
- `src/game/habiti/resolveOwnedHabitiEffects.test.ts`
- `src/game/habiti/producerOutputBonusState.test.ts`

Required assertions:
- producer-tag bonuses aggregate per tag
- unknown Habitus ids still call existing unknown-id hook and do not crash
- existing resource-wide aggregation behavior remains unchanged

### Compiler and integration tests
Add or change:
- `src/engine/compiler/abilities/resourceGainAmountCompiler.test.ts`
- `src/engine/compiler/abilities/productionCompiler.test.ts`
- `src/engine/compiler/abilities/conversionCompilerAmounts.test.ts` or the nearest existing conversion amount test file

Required assertions:
- final production amount includes resource-wide and producer-tag bonuses together
- unmatched producer tags do not change final amount
- multiple matching producer tags stack additively

### View tests
Add or change:
- `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainRuntime.test.ts`
- `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGain.test.ts`
- `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.test.tsx`

Required assertions:
- tooltip origin lines include producer-tag Habitus entries
- `Base`, `Total Bonuses`, and `Final` remain present and correct
- editor renders `Producer Tag` only for the new effect type

---

# Feature 3 — Cycle Ability resource costs

## Why

Cycle progression already has power demand, progress, conditional activation, and optional cycle-based scaling, but it does not support authored non-power resource consumption as part of running the cycle itself.

The requested feature is not new storage behavior. It is a composition of cycle authoring with storage-compatible cost state and request behavior so that cycle cards can show, fill, and consume those costs using existing mechanisms.

## What

Add resource costs directly to Cycle Ability.

### Authored contract
Extend `_editor.abilities.cycle` with:
- `resourceCosts: CycleResourceCostConfig[]`

Each `CycleResourceCostConfig` has this exact shape:
- `resource: string`
- `amount: ScalableValue`
- `scaleByBodiesOwned: boolean`
- `scaleByCyclesCompleted: boolean`
- `visible: boolean` default `true`
- `priority: number`

No nesting under Storage Ability is required or allowed.
The costs belong to Cycle Ability authoring only.

### Runtime contract
For each cycle resource cost entry, compilation creates:
1. a dedicated local state storage entry for the resource cost reservoir
2. storage-like metadata on that state entry:
   - `allowDeposit: true`
   - `allowWithdraw: false`
   - `priority: authored priority`
3. auto-request behavior equivalent to storage auto-request with withdrawals disabled
4. consumption of the required resource amount when the cycle completes
5. optional display bar when `visible === true`

### Scaling contract
For each resource cost entry:
- start from authored `amount`
- if `scaleByBodiesOwned` is true, apply the same scalable compilation pattern already used for scalable authored values
- if `scaleByCyclesCompleted` is true, multiply by the existing cycle-count scaler used by `costMultPerCycle`

If both booleans are true, both scaling sources apply.

### Card-display contract
Visible cycle costs render as bars in the same activity card area where storage bars already render.

Each visible cost must therefore be representable through the same bar model shape used by storage displays.

## How

### Composition strategy
Do not make Cycle Ability itself render UI.
Do not introduce a special-case card display path for cycle costs.

Instead, compile each cycle cost into state that already satisfies the storage-bar reader contract, then expose those entries through the same `resolveStorageAbilityBars(...)` pipeline.

### Compiler strategy
Add a dedicated cycle-cost compiler that runs from `cycleCompiler.ts`.

That compiler is responsible for:
- compiling per-cost base amount state
- compiling per-cost final amount state
- applying scalable value compilation for bodies-owned scaling
- applying the existing cycle-count scaling mechanism when `scaleByCyclesCompleted` is true
- creating the local reservoir state entry with storage-compatible metadata
- creating auto-request behavior equivalent to storage auto-request and fixed to:
  - source: `tag:storage:<resource>` unless a later design explicitly extends this
  - withdrawals disabled on the local reservoir
  - auto-request enabled
- adding a cycle-complete consume rule that subtracts the final required amount from the local reservoir
- adding cycle gating conditions so the cycle cannot complete unless all cost reservoirs have sufficient value

### UI strategy
Add a dedicated editor component for cycle resource costs rather than inlining the fields directly into `CycleAbilityForm.tsx`.

This component is part of the cycle editor composition and is the only place where cycle resource-cost rows are added, removed, and edited.

Every interactive control introduced for resource costs must have a `SmartTooltip`.

### Reuse strategy
Reused mechanisms are mandatory here:
- scalable value compilation for base cost amounts
- cycle count scaler for cycle-completion-based scaling
- storage-compatible state metadata
- `compileStorageAutoRequest(...)` for refill behavior, with a fixed no-withdraw local reservoir contract
- `resolveStorageAbilityBars(...)` and `StorageAbilityDisplay.tsx` for runtime card bars

No bespoke request system or bespoke bar renderer is allowed.

## Files to add or change

### Change — `src/data/schemas/abilities/cycle.ts`
**Responsibility**: canonical authored schema for Cycle Ability.

**Logic**:
- add `resourceCosts: z.array(CycleResourceCostSchema).default([])`
- define `CycleResourceCostSchema` in this file or a colocated helper file used only by cycle schema

**Interface**:
- `CycleAbilityConfig["resourceCosts"]`
- `CycleResourceCostConfig`

### Add — `src/engine/compiler/abilities/cycleResourceCostCompiler.ts`
**Responsibility**: compile one or more cycle resource costs into state, passive effects, and behavior rules.

**Logic**:
- create base and final amount state keys per cost row
- apply scalable amount compilation for the base amount
- optionally apply cycle-count scaling to the final amount
- create the local reservoir state entry with `allowDeposit: true`, `allowWithdraw: false`, and authored `priority`
- compile auto-request behavior against `tag:storage:<resource>`
- compile gating and consume behavior for cycle completion
- add an optional display bar when `visible` is true

**Interface**:
- `cycleResourceCostCompiler(draft: Blueprint, config: CycleAbilityConfig): void`

### Change — `src/engine/compiler/abilities/cycleCompiler.ts`
**Responsibility**: orchestrate all cycle-related compilation.

**Logic**:
- invoke `cycleResourceCostCompiler(...)`
- keep existing cycle state, power, reset, transition, and bar behavior unchanged

**Interface**:
- no signature change

### Change — `src/engine/compiler/abilities/cycleCompiler.rules.ts`
**Responsibility**: cycle reset and cycle-complete behavior rule helpers.

**Logic**:
- add explicit gating hook points or rule composition needed so cycle completion is blocked unless all compiled cycle costs are affordable
- keep existing reset semantics unchanged once gating passes

**Interface**:
- helper signatures may expand to accept extra cost-gate conditions

### Change — `src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx`
**Responsibility**: top-level Cycle Ability editor composition.

**Logic**:
- render the new cycle resource-costs section component
- do not inline row-edit logic directly in this file
- add `SmartTooltip` to any newly touched interactive elements in this form

**Interface**:
- existing props unchanged

### Add — `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostsSection.tsx`
**Responsibility**: CRUD container for cycle resource-cost rows.

**Logic**:
- list existing cost rows
- add and remove rows
- delegate row editing to `CycleResourceCostRow`
- all buttons and row titles must be tooltip-wrapped

**Interface**:
- `CycleResourceCostsSection({ filename, basePath }: Props)`

### Add — `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.tsx`
**Responsibility**: editor for one cycle resource-cost row.

**Logic**:
- edit `resource`, `amount`, `scaleByBodiesOwned`, `scaleByCyclesCompleted`, `visible`, and `priority`
- reuse existing field components where they fit
- every interactive control must have `SmartTooltip`

**Interface**:
- `CycleResourceCostRow({ filename, path, index, onDelete }: Props)`

### Change — `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts`
**Responsibility**: derive storage-bar models from entity state plus display metadata.

**Logic**:
- ensure cycle-cost reservoir entries that carry storage-compatible metadata and an authored display bar are included exactly once
- do not special-case cycle costs by card type

**Interface**:
- no signature change

### Change — `src/ui/runtime/world/selection/job-card/PowerJobCardView.tsx`
**Responsibility**: activity card display.

**Logic**:
- no new bespoke UI path; continue rendering `StorageAbilityDisplay` and therefore pick up visible cycle-cost bars automatically

**Interface**:
- no prop change required for this feature

## Tests

### Unit tests
Add or change:
- `src/engine/compiler/abilities/cycleResourceCostCompiler.test.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostRow.test.tsx`
- `src/ui/devtools/editors/blueprint/mode/forms/CycleResourceCostsSection.test.tsx`

Required assertions:
- cost rows compile base and final amount state
- `scaleByBodiesOwned` applies authored scalable-value behavior
- `scaleByCyclesCompleted` applies cycle-count scaling
- reservoir state entries have `allowDeposit: true`, `allowWithdraw: false`, and authored priority
- visible rows compile display bars and invisible rows do not

### Integration tests
Add or change:
- `src/engine/compiler/abilities/cycleCompiler.test.ts`
- `src/engine/compiler/abilities/cycleCompiler.costMult.test.ts`
- a runtime integration test under the nearest existing cycle runtime test location

Required assertions:
- cycles do not complete when any compiled cost reservoir is below required amount
- cycle completion consumes the required amount from each reservoir once
- auto-request rules refill cost reservoirs from `tag:storage:<resource>`
- multiple costs on one cycle stack independently and do not overwrite one another

### View tests
Add or change:
- `src/ui/runtime/world/selection/job-card/JobCard.storage.test.tsx`
- `src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts`

Required assertions:
- visible cycle-cost reservoirs appear in the activity card storage-bar stack
- invisible cycle-cost reservoirs do not appear
- bar tooltip still reflects priority and transfer-permission semantics correctly

---

## Final contract summary

This change set implements exactly three features:
1. suspicious-activity indicators for purge-advancing activities, derived from existing updater abilities and configured through `game_config.susDisplays`
2. a new Habitus effect that boosts producer outputs by producer tag, reusing the existing hidden world-state production-bonus pipeline
3. cycle resource costs compiled as storage-compatible reservoirs and rendered through the existing storage-bar stack

This design does not add a Child Ability.
It does not introduce a new runtime mutation system.
It does not duplicate existing storage, tooltip, or production-bonus mechanisms.
