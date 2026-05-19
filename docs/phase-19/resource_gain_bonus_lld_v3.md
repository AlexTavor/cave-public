# LLD — Cave Habiti Resource Gain Bonuses for Generic Production, Conversion, and Runtime UI

## Purpose

Implement cave-owned `add_resource_gain_multiplier` bonuses so that:

1. generic `production` abilities apply the bonus at runtime,
2. generic `conversion` abilities apply the bonus to conversion outputs at runtime,
3. generic `JobCard` production and conversion numbers display the adjusted values,
4. `HabitiGainDisplay` resource rows display the adjusted values,
5. every displayed affected value uses the existing `SmartTooltip` rendering path and explains the bonus breakdown using the existing authored Habiti effect descriptions.

This design is constrained by the uploaded architecture and testing documents. It must preserve the command pipeline, keep UI presentation-only, avoid speculative refactors, and reuse existing runtime/UI mechanisms where they already solve the problem.

---

## Why

## Current implementation gap

The inspected codebase already resolves cave-owned Habiti bonuses in `resolveOwnedHabitiEffects`, but only the absorption path consumes `resourceGainMultipliers`.

Observed behavior in source:

- `src/game/habiti/resolveOwnedHabitiEffects.ts` aggregates `resourceGainMultipliers` by resource.
- `src/game/handlers/resolveAbsorptionHabitiOutcome.ts` applies those multipliers for absorption preview/runtime.
- `src/engine/compiler/abilities/productionCompiler.ts` compiles generic `production` abilities to use one amount state per production row and does not read any cave-owned Habiti bonus.
- `src/engine/compiler/abilities/conversionCompiler.ts` compiles conversion input and output amount states and does not read any cave-owned Habiti bonus.
- `src/engine/compiler/abilities/conversionCompilerUtils.ts` builds conversion rules whose output `MUTATE` actions read the compiled output refs directly.
- `src/ui/runtime/world/selection/job-card/jobAnalysis.effectBuilders.ts` reads compiled production and conversion amounts from runtime state and displays them in `JobCard`, but it does not compute or display any cave-owned Habiti bonus breakdown.
- `src/ui/runtime/habiti/HabitiGainDisplay.tsx` renders preview resources as freeform `RichText`, so individual values are not wrapped in `SmartTooltip` and cannot carry per-resource breakdowns.

Therefore the feature is currently missing in three places:

1. generic production runtime,
2. generic conversion-output runtime,
3. runtime UI for the values produced by those paths.

## Debt and efficiency constraints that this design must satisfy

The revised design must explicitly avoid the following forms of debt.

### D1. No expansion of passive-effect or value-resolution address semantics

The runtime already supports world-derived numeric globals through:

- `Snapshot.getGlobal`
- behavior value resolution for `global.*`
- compiler/runtime logic that already consumes `global.*`

Therefore this feature must not add support for foreign entity paths such as arbitrary `sys_world.state.*` reads. Generic production and generic conversion outputs must consume cave-derived bonuses through the existing global path.

### D2. No always-on reconciliation system

A permanent tick-time reconciliation system for derived Habiti bonus state would add avoidable ongoing work and duplicate ownership of the same derived data.

The derived state must instead be synchronized only on the actual mutation paths that can change cave-owned Habiti or recreate runtime state.

### D3. No duplicate runtime/UI math contracts

The runtime must remain the source of truth for generic production amounts and generic conversion output amounts.

`JobCard` must read adjusted amounts from runtime state, not recompute the displayed final values independently.

The UI may compute tooltip breakdown metadata, but it must not become a second source of truth for the displayed final value.

### D4. No second tooltip renderer

The existing `AbilityEffectList` + `AbilityEffectModel` + `AbilityInlineDisplayLine` + `SmartTooltip` path already solves row-level and header-line tooltip rendering.

This feature must reuse that path for both `JobCard` and `HabitiGainDisplay` resource rows.

### D5. No ambiguity in amount-key ownership

Today production and conversion compilers assemble amount state keys inline.

This feature must introduce one canonical amount-key helper so that:

- compilers create the same keys that UI readers consume,
- UI files do not reverse-engineer key shapes from rule ids,
- production and conversion amount-key semantics are explicit and testable.

---

## What

## Functional requirements

### R1. Generic production runtime must apply cave-owned resource gain bonuses

Affected runtime scope:

- generic `production` abilities compiled by `productionCompiler`

Behavior:

- the produced amount for a resource is multiplied by the total cave-owned `add_resource_gain_multiplier` delta for that resource,
- the runtime behavior rule uses the adjusted amount,
- the runtime still stores the unadjusted base amount in a separate hidden state entry.

### R2. Generic conversion runtime must apply cave-owned resource gain bonuses to outputs only

Affected runtime scope:

- generic `conversion` abilities compiled by `conversionCompiler`

Behavior:

- every conversion output amount for a resource is multiplied by the total cave-owned `add_resource_gain_multiplier` delta for that resource,
- conversion input requirements and input consumption are unchanged,
- the conversion rule must continue to gate inputs against the unadjusted input amount refs,
- only positive output mutations are bonus-adjusted.

This is the required contract because the effect is a resource gain multiplier, not a resource cost modifier.

### R3. Generic `JobCard` production rows must display the adjusted amount

Example contract:

- base amount: `100`
- total cave-owned bonus delta for that resource: `0.10`
- displayed value: `110`

The production row tooltip must explain:

- base amount,
- each contributing Habitus bonus delta for that resource,
- the authored description line(s) for that specific resource bonus effect,
- final amount.

### R4. Generic `JobCard` conversion output values must display the adjusted amount

There are two display surfaces for conversion values in `JobCard`:

1. the conversion effect rows,
2. the conversion header lines built in `nextCycleHeaderLines.ts`.

Contract:

- positive conversion output values display the adjusted runtime final amount,
- negative conversion input values remain unchanged,
- every displayed positive conversion output value that appears in a tooltip-capable surface must expose the same breakdown contract as production.

Header-line contract:

- any conversion header line token sequence that includes a positive output value must carry tooltip metadata derived from the corresponding output effect row,
- unaffected input-only text does not require a bonus tooltip.

### R5. `HabitiGainDisplay` resource rows must display the adjusted amount

Example contract:

- base preview amount: `100`
- total cave-owned bonus delta for that resource: `0.10`
- displayed value: `110`

The resource row tooltip must explain the same breakdown contract as `JobCard`.

### R6. Cave-derived runtime state must be synchronized only on real mutation paths

The derived world state that exposes total cave-owned bonus deltas must be synchronized on exactly these paths:

1. `UPDATE_CAVE`
2. absorption completion, by routing owned-Habiti changes back through `UPDATE_CAVE`
3. save-game hydration, by re-triggering the `UPDATE_CAVE` synchronization path once after hydrate

No permanent reconciliation system is allowed.

### R7. Existing rendering and authored-description mechanisms must be reused

Reuse:

- `resolveOwnedHabitiEffects` for aggregated deltas
- existing Habiti definitions from cartridge config
- authored `effect.description` strings from Habiti effects
- `AbilityEffectList`
- `AbilityEffectModel`
- `AbilityInlineDisplayLine`
- `SmartTooltip`

Do not add a parallel tooltip framework.

---

## Explicit non-goals

- No change to authored data files.
- No schema change for Habiti effects.
- No change to absorption runtime math.
- No change to conversion input requirements or input consumption.
- No change to cave attribute bonus handling.
- No change to passive-effect engine semantics.
- No periodic sync system.
- No refactor of unrelated job-card groups.

---

## Contracts

## Numeric contract

### Generic production final amount

For each generic production row:

- `baseAmount` = existing compiled production amount before cave-owned resource bonus
- `delta` = total cave-owned bonus delta for the produced resource
- `finalAmount` = `baseAmount * (1 + delta)`

This design does not introduce a new production-specific floor or integer clamp.

Reason:

- generic production already uses numeric runtime state,
- the current production path is not floored,
- introducing new rounding would be new behavior outside the requested feature.

### Generic conversion final output amount

For each generic conversion output row:

- `baseAmount` = existing compiled conversion output amount before cave-owned resource bonus
- `delta` = total cave-owned bonus delta for the output resource
- `finalAmount` = `baseAmount * (1 + delta)`

For each generic conversion input row:

- `baseAmount` = existing compiled conversion input amount
- `finalAmount` = `baseAmount`

No new conversion-specific floor or integer clamp is introduced.

### Absorption preview display amount

This design does not change absorption runtime math.

For `HabitiGainDisplay`, the displayed base and final resource amounts are obtained from the existing absorption preview path:

- `baseAmount` = preview outcome with zero Habiti resource-gain bonuses and zero XP-conversion bonus
- `finalAmount` = preview outcome with current Habiti bonuses

The tooltip explains that difference. The runtime/output logic remains unchanged.

## Derived world-state contract

A hidden `sys_world.state` entry exists for each resource that appears in any authored `add_resource_gain_multiplier` Habiti effect.

Each such entry stores the total resolved cave-owned bonus delta for that resource.

Contract:

- entity: `sys_world`
- visibility: `false`
- value: total delta for that resource from cave-owned Habiti
- absent bonus: stored as `0`

The derived state exists only to expose cave-owned bonus deltas through the already-supported `global.*` path.

## Key naming contract

The design introduces two canonical naming helpers.

### World bonus-state key helper

Owns the hidden `sys_world.state` key used to expose total cave-owned bonus delta for a resource.

### Amount-state key helper

Owns all amount state keys introduced or consumed by this feature for:

- generic production base amount
- generic production final amount
- generic conversion input amount
- generic conversion output base amount
- generic conversion output final amount

No compiler or UI file may assemble these keys inline.

## Tooltip contract

For every affected displayed resource value:

- the value is rendered in a row or header line that is wrapped by `SmartTooltip`,
- tooltip title is non-empty,
- tooltip lines always include `Base` and `Final`,
- if no contribution exists, the tooltip explicitly says `Bonuses: none`,
- if contributions exist, they are ordered deterministically and include the authored description line(s) that correspond to the matching resource bonus effect.

Deterministic contribution ordering:

1. by Habitus label,
2. then by Habitus id.

If one Habitus contains multiple matching `add_resource_gain_multiplier` effects for the same resource:

- its delta is summed into one Habitus contribution entry,
- all matching authored descriptions are preserved in authored order.

## Runtime/UI source-of-truth contract

### Generic production

The displayed final amount in `JobCard` must come from the compiled runtime final amount state.

The UI may read the base amount state and the contribution breakdown to explain the number, but it must not recompute the displayed final amount when the runtime final amount state exists.

### Generic conversion outputs

The displayed final output amount in `JobCard` must come from the compiled runtime final output amount state.

The UI may read the base output amount state and the contribution breakdown to explain the number, but it must not recompute the displayed final output amount when the runtime final output amount state exists.

### Absorption preview

`HabitiGainDisplay` is a preview component, not a live runtime-state component.

For absorption preview only, the component may receive both base and final amounts from the preview hook because there is no compiled runtime production/conversion state involved.

---

## How

## High-level architecture

The feature is implemented in five layers.

### Layer 1. Synchronize cave-owned bonus deltas into hidden `sys_world.state`

A game-specific `UPDATE_CAVE` handler overrides the engine handler registration.

It performs two steps:

1. delegate to the existing engine `UpdateCaveHandler` implementation,
2. enqueue hidden `UPDATE_STATE` commands for every resource-gain bonus state key on `sys_world`.

The hidden state values are derived from the current `sys_world.cave.ownedHabiti` and the authored Habiti config.

This uses the existing command pipeline and completes in the same apply phase because `CommandsManager.process()` already drains until empty.

### Layer 2. Make absorption-owned-Habiti changes flow through `UPDATE_CAVE`

The current absorption path mutates `cave.cave.ownedHabiti` directly inside batch processing.

That bypasses the `UPDATE_CAVE` synchronization path.

The revised design removes that direct mutation. Instead:

- batch processing returns the final owned-Habiti list,
- `AbsorbBatchHandler` enqueues `UPDATE_CAVE` with that final list when it changed.

This removes duplicate ownership of cave-owned Habiti mutation and keeps the bonus-state sync path centralized.

### Layer 3. Compile generic production into base state plus final state

Generic production keeps the existing final amount state path used by behavior rules and UI.

The compiler adds one new hidden base amount state per production row.

Compilation contract:

- existing production final amount state remains the final amount state consumed by runtime behavior and UI,
- new hidden base state stores the unmodified compiled production amount,
- final state is derived by passive effects from:
  - base state,
  - the hidden global world bonus delta for that resource.

This reuses the already-supported `global.*` path and avoids engine changes.

### Layer 4. Compile generic conversion outputs into base state plus final state

Generic conversion splits amount semantics by role.

Input compilation contract:

- input amount state remains unchanged,
- input gates and input `SUB` actions continue to use that unchanged input amount ref.

Output compilation contract:

- each conversion output gains a hidden base output amount state,
- each conversion output keeps a final output amount state consumed by the conversion rule and the UI,
- final output state is derived by passive effects from:
  - base output state,
  - the hidden global world bonus delta for that output resource.

This ensures that conversion outputs benefit from the bonus while inputs do not.

### Layer 5. Reuse existing effect-row and header-line UI rendering

`JobCard` already renders next-cycle data through `AbilityEffectList`, which supports both row tooltips and header-line tooltips.

That path is retained.

Required UI behavior:

- production effect rows become bonus-aware,
- conversion output effect rows become bonus-aware,
- conversion header lines that include output values inherit the corresponding output tooltip metadata,
- `HabitiGainDisplay` is changed from freeform resource text to structured effect rows rendered through `AbilityEffectList`.

---

## File-by-file design

## Added files

### 1. `src/game/habiti/resourceGainBonusState.ts`

Responsibility:

- define the canonical hidden world-state key contract for resource-gain bonus deltas,
- enumerate all authored resources that can receive `add_resource_gain_multiplier`,
- provide read helpers for those derived state values where needed.

Logic:

- scan Habiti definitions and collect every unique `effect.resource` for `add_resource_gain_multiplier`,
- sort the result deterministically,
- expose one canonical function that maps a resource id to its hidden `sys_world.state` key,
- expose a reader that returns `0` when the key is missing or non-numeric.

Interface:

- pure functions only,
- no command enqueuing,
- no UI formatting,
- no direct runtime mutation.

### 2. `src/game/habiti/resolveResourceGainBonusBreakdown.ts`

Responsibility:

- resolve the deterministic per-resource Habiti contribution breakdown used by tooltips.

Logic:

For a given `resource`, `ownedHabiti`, and Habiti index:

- inspect only `add_resource_gain_multiplier` effects that match that resource,
- aggregate contributions by Habitus,
- preserve authored description strings for the matching effects only,
- sum the total delta,
- sort contribution entries deterministically by label then id.

Returned data model must be UI-neutral and include only semantic data:

- `totalDelta`
- `contributions[]`
  - `habitusId`
  - `label`
  - `delta`
  - `descriptions[]`

Interface:

- pure function,
- no string formatting of final tooltip lines,
- no runtime mutation.

### 3. `src/game/habiti/enqueueResourceGainBonusStateSync.ts`

Responsibility:

- enqueue hidden `UPDATE_STATE` commands that synchronize the derived world bonus-delta state from current cave-owned Habiti.

Logic:

Inputs:

- command buffer,
- `sys_world` runtime entity,
- authored Habiti index,
- optional error logger for unknown owned Habiti ids.

Behavior:

- read `sys_world.cave.ownedHabiti`,
- resolve aggregated resource-gain multipliers with `resolveOwnedHabitiEffects`,
- enumerate the full authored resource set from `resourceGainBonusState.ts`,
- for each authored resource, enqueue `UPDATE_STATE` with:
  - `entityId = sys_world`
  - `key = canonical hidden key`
  - `value = resolved delta or 0`
  - `visible = false`

This file owns reset-to-zero behavior for removed bonuses.

Interface:

- command-enqueuing helper only,
- no direct mutation,
- safe no-op when command buffer or `sys_world` is unavailable.

### 4. `src/engine/compiler/abilities/resourceGainAmountKeys.ts`

Responsibility:

- define the canonical amount state-key contract used by compilers and UI readers.

Logic:

Expose explicit helpers for:

- production base amount key
- production final amount key
- conversion input amount key
- conversion output base amount key
- conversion output final amount key

The helper must accept the minimum explicit identifiers required by existing compilation structure:

- resource id,
- production index or conversion index,
- conversion output index where applicable.

Interface:

- pure deterministic string helpers only,
- no runtime reads,
- no UI formatting,
- no command logic.

### 5. `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.ts`

Responsibility:

- override the engine `UPDATE_CAVE` registration in the game layer and append derived bonus-state synchronization.

Logic:

- hold an internal instance of the engine `UpdateCaveHandler`,
- delegate the incoming command to that handler,
- if the target entity still resolves and exposes a cave component, call `enqueueResourceGainBonusStateSync`.

Reason for wrapper design:

- reuses the existing engine cave-update logic instead of duplicating it,
- localizes game-specific derived-state behavior to the game layer.

Interface:

- same command type as engine `UpdateCaveHandler`,
- same external `UPDATE_CAVE` payload contract,
- no new command type.

### 6. `src/ui/runtime/world/selection/job-card/resourceGainTooltipLines.ts`

Responsibility:

- convert semantic breakdown data into deterministic tooltip strings for production, conversion outputs, and preview gains.

Logic:

Inputs:

- display context title,
- base amount,
- final amount,
- breakdown from `resolveResourceGainBonusBreakdown`.

Behavior:

- reuse existing amount formatting utilities already used by effect rows,
- format the required `Base`, `Bonuses`, and `Final` lines,
- format each contribution as one percent line followed by its authored descriptions.

Interface:

- pure formatting helper,
- no runtime reads,
- no React,
- no command logic.

---

## Changed files

### 7. `src/game/registerGameCommandHandlers.ts`

Responsibility change:

- register the game-specific `UPDATE_CAVE` override so it replaces the engine default handler.

Logic:

- register `UpdateCaveWithResourceGainBonusHandler` after runtime creation and before runtime use,
- because command handlers are keyed by type, this replaces the earlier engine registration for `UPDATE_CAVE`.

Interface impact:

- no caller-facing contract change.

### 8. `src/game/handlers/absorptionBatchProcessing.ts`

Responsibility change:

- stop mutating `cave.cave.ownedHabiti` directly,
- return the post-processing owned-Habiti list instead.

Logic change:

- keep all existing outcome aggregation,
- keep local set-based accumulation of owned Habiti during batch processing,
- remove the final direct write to `cave.cave.ownedHabiti`,
- return `ownedHabitiAfterProcessing` as a sorted array.

Interface change:

- output payload is extended with `ownedHabitiAfterProcessing`.

Reason:

- centralizes cave-owned Habiti writes behind `UPDATE_CAVE`,
- ensures derived bonus-state synchronization is not bypassed.

### 9. `src/game/handlers/AbsorbBatchHandler.ts`

Responsibility change:

- persist owned-Habiti changes through `UPDATE_CAVE` instead of direct mutation side effects.

Logic change:

- consume `ownedHabitiAfterProcessing` returned from batch processing,
- compare it to the current cave-owned Habiti list,
- if changed, enqueue `UPDATE_CAVE` for `sys_world` with the final owned-Habiti list,
- do not duplicate derived bonus-state synchronization in this handler.

Interface impact:

- no command payload change for callers,
- internal handler behavior changes only.

### 10. `src/ui/runtime/state/persistenceSlice.ts`

Responsibility change:

- after hydrating a save into a fresh runtime, re-trigger the `UPDATE_CAVE` synchronization path once.

Logic change:

- after `freshRuntime.hydrate(data)`, read `sys_world.cave.ownedHabiti` from the hydrated runtime,
- enqueue `UPDATE_CAVE` with `entityId = sys_world` and that owned-Habiti list,
- immediately `flushCommands()`.

Reason:

- hydrated saves bypass `UPDATE_CAVE`,
- older saves may not contain the new hidden derived state,
- this restores the derived bonus state without requiring a permanent runtime system.

Interface impact:

- no external API change.

### 11. `src/engine/compiler/abilities/productionCompiler.ts`

Responsibility change:

- compile generic production into base-plus-final amount states while keeping the existing final amount state path as the runtime/UI contract.

Logic change:

For each generic production row:

1. resolve the production base amount key through `resourceGainAmountKeys.ts`,
2. resolve the production final amount key through `resourceGainAmountKeys.ts`,
3. compile the authored scalable amount into the base amount state,
4. derive the final amount state from:
   - base amount state,
   - `1 + global.<resource bonus state key>`.

The behavior rule continues to reference the final amount state.

Required ordering:

- base amount must be resolved before final amount,
- final amount must be fully derived before `sys_produce_*` reads it during behavior execution.

Interface impact:

- behavior rule ids remain unchanged,
- final amount state path used by existing analysis remains intact but is now supplied by the key helper,
- one new hidden base state key is introduced per production row.

### 12. `src/engine/compiler/abilities/conversionCompiler.ts`

Responsibility change:

- compile conversion outputs into base-plus-final amount states while preserving existing input amount semantics.

Logic change:

For each conversion input:

1. resolve the input amount key through `resourceGainAmountKeys.ts`,
2. compile the authored scalable amount into that unchanged input amount state,
3. keep input conditions and input `SUB` actions bound to that unchanged ref.

For each conversion output:

1. resolve the output base amount key through `resourceGainAmountKeys.ts`,
2. resolve the output final amount key through `resourceGainAmountKeys.ts`,
3. compile the authored scalable amount into the base output amount state,
4. derive the final output amount state from:
   - base output amount state,
   - `1 + global.<resource bonus state key>`.

The conversion rule must reference the final output amount refs for positive output mutations.

Required invariants:

- output bonuses never affect input requirements,
- output bonuses never affect input `SUB` values,
- output bonuses always affect positive output `ADD` values.

Interface impact:

- conversion rule ids remain unchanged,
- sourceIndex semantics remain unchanged,
- one new hidden base output amount state key is introduced per conversion output row.

### 13. `src/engine/compiler/abilities/conversionCompilerUtils.ts`

Responsibility change:

- none to external role, but it must accept the updated output refs produced by the compiler.

Logic change:

- no semantic change to input handling,
- no semantic change to rule shape,
- output action values continue to use the output refs passed in by `conversionCompiler`, which will now be final output refs rather than raw authored refs.

Interface impact:

- no public contract change if the helper already consumes `outputRefs` abstractly,
- tests must lock that output actions use the final output refs.

### 14. `src/ui/runtime/world/selection/job-card/jobAnalysis.effectBuilders.ts`

Responsibility change:

- make production effect rows and conversion output effect rows bonus-aware and attach deterministic tooltip lines.

Logic change:

For production rows:

- read `finalAmount` from the runtime final amount state,
- read `baseAmount` from the matching runtime base amount state via `resourceGainAmountKeys.ts`,
- resolve the resource-specific Habiti contribution breakdown,
- build tooltip lines with `resourceGainTooltipLines.ts`,
- keep `valueText` bound to the runtime final amount.

For conversion rows:

- preserve existing grouping by rule and tone,
- for negative input effects:
  - keep current displayed amount semantics,
  - do not attach resource-gain breakdown lines,
- for positive output effects:
  - read `finalAmount` from the runtime final output state,
  - read `baseAmount` from the matching runtime base output state via `resourceGainAmountKeys.ts`,
  - resolve the resource-specific Habiti contribution breakdown,
  - build tooltip lines with `resourceGainTooltipLines.ts`,
  - keep `valueText` bound to the runtime final output amount.

This file must not recompute the displayed final amount when the runtime final amount exists.

Interface change:

- production and conversion builders now require `runtime` so they can access `sys_world` and the Habiti index.

### 15. `src/ui/runtime/world/selection/job-card/jobAnalysis.rules.ts`

Responsibility change:

- pass `runtime` into the production and conversion effect builders.

Logic change:

- production branch passes `runtime`,
- conversion branch passes `runtime`,
- draft and transform branches remain untouched.

Interface impact:

- internal-only signature change.

### 16. `src/ui/runtime/world/selection/job-card/nextCycleHeaderLines.ts`

Responsibility change:

- ensure conversion header lines expose tooltip metadata for bonus-adjusted output values.

Logic change:

- keep existing token order and text layout,
- when building conversion predicted/output header lines, carry tooltip metadata from the corresponding positive output effect rows,
- do not attach resource-gain breakdown tooltips to negative input-only spans,
- if one header line represents multiple positive outputs, the line tooltip must contain all positive-output breakdowns in deterministic output order.

Interface impact:

- no type change required because `AbilityInlineDisplayLine` already supports tooltip metadata.

### 17. `src/ui/runtime/habiti/HabitiGainDisplay.tsx`

Responsibility change:

- replace freeform resource summary text with structured effect rows rendered through `AbilityEffectList`.

Logic change:

- keep the XP line behavior unchanged,
- keep Habiti pill rendering unchanged,
- replace `resourceTotals` text rendering with an `AbilityEffectList` section whose rows represent resources,
- each row is backed by `AbilityEffectModel` and therefore wrapped by `SmartTooltip` automatically.

Interface change:

- replace the old flat `resourceTotals` input with a structured resource-row input that includes:
  - `resource`
  - `baseAmount`
  - `finalAmount`
  - tooltip metadata or semantic breakdown inputs

This component must remain presentation-only.

### 18. `src/ui/runtime/world/selection/absorption/useBodySelector.ts`

Responsibility change:

- prepare structured preview resource rows for `HabitiGainDisplay`.

Logic change:

For preview resources:

1. run the existing preview outcome with current bonuses,
2. run the same preview outcome with zero resource-gain bonuses and zero XP-conversion bonus,
3. join the two result sets by resource,
4. resolve the resource-specific Habiti contribution breakdown from cave-owned Habiti,
5. build tooltip lines with `resourceGainTooltipLines.ts`,
6. return structured resource-row data for the display component.

This file remains the correct place for preview-only computation because `HabitiGainDisplay` must stay presentation-only.

Interface change:

- preview output gains a structured resource-row collection for the display component.

### 19. `src/ui/runtime/world/selection/absorption/BodySelector.tsx`

Responsibility change:

- pass the new structured resource-row prop into `HabitiGainDisplay`.

Logic change:

- no new business logic,
- simple prop wiring only.

Interface impact:

- local component wiring only.

---

## Tooltip composition rules

The tooltip string builder is shared conceptually across `JobCard` production rows, `JobCard` conversion output rows, conversion header lines, and `HabitiGainDisplay`, even if implemented in one thin formatting helper.

Required output shape for an affected resource:

1. `Base: <formatted amount>`
2. if no contributions: `Bonuses: none`
3. else, for each contribution in deterministic order:
   - `<Habitus label>: +<formatted percent>`
   - each matching authored description line for that Habitus/resource effect
4. `Final: <formatted amount>`

Formatting rules:

- amount formatting must reuse existing numeric formatting already used for effect rows,
- percent formatting must be deterministic and human-readable,
- tooltip title must clearly identify the row as a production, conversion output, or gain breakdown,
- header-line tooltip ordering for multiple conversion outputs must match the authored output order within that conversion ability.

---

## State and data-flow summary

### Generic production runtime flow

1. cave-owned Habiti are updated through `UPDATE_CAVE`,
2. game-specific `UPDATE_CAVE` handler enqueues hidden world bonus-state updates,
3. passive effects on producer entities read those bonuses through `global.*`,
4. compiled final production amount state updates,
5. `sys_produce_*` behavior rules consume the final amount state,
6. `JobCard` reads the same final state and shows the same number.

### Generic conversion runtime flow

1. cave-owned Habiti are updated through `UPDATE_CAVE`,
2. game-specific `UPDATE_CAVE` handler enqueues hidden world bonus-state updates,
3. passive effects on converter entities read those bonuses through `global.*`,
4. compiled final conversion output amount states update,
5. `sys_convert_*` behavior rules consume unchanged input refs and adjusted output refs,
6. `JobCard` reads the same final output states and shows the same output numbers.

### Absorption-owned-Habiti mutation flow

1. absorption processing computes new owned Habiti,
2. absorption handler enqueues `UPDATE_CAVE` with the final owned list,
3. game-specific `UPDATE_CAVE` handler synchronizes hidden world bonus state,
4. future generic production and conversion automatically see the updated bonus through the same global path.

### Hydration flow

1. save data hydrates entities directly,
2. persistence load path enqueues one `UPDATE_CAVE` with the hydrated owned Habiti,
3. derived hidden bonus state is recreated,
4. runtime is consistent before gameplay resumes.

---

## Design constraints that prevent debt and inefficiency

### C1. Single semantic owner for cave-owned Habiti derived state

The only mechanism that synchronizes hidden resource-gain bonus world state is `enqueueResourceGainBonusStateSync`, invoked from:

- game-specific `UPDATE_CAVE` handler,
- hydration re-trigger through `UPDATE_CAVE`.

Absorption does not own a second sync path; it routes changes through `UPDATE_CAVE`.

### C2. No per-tick reconciliation work

Synchronization occurs only on actual mutation or hydration events.

There is no background or pre-behavior system for this feature.

### C3. One canonical amount-key contract

Production compiler, conversion compiler, and UI readers all consume `resourceGainAmountKeys.ts`.

No file duplicates key shapes inline.

### C4. Minimal compiler surface-area change

- production keeps its existing external final-state behavior contract,
- conversion keeps its existing rule ids and input semantics,
- only the amount-state structure is extended where the feature actually applies.

### C5. One semantic breakdown resolver

`resolveResourceGainBonusBreakdown` is the sole owner of contribution aggregation and deterministic ordering.

`JobCard` and `HabitiGainDisplay` consume it. No file may duplicate Habiti contribution traversal inline.

### C6. Presentation-only UI components

- `HabitiGainDisplay` stays presentation-only.
- `BodySelector` and job-analysis helpers prepare the data.
- no business logic moves into `.tsx` beyond rendering and simple prop wiring.

---

## Tests

The implementation is complete only if the following tests are added or updated.

## Unit tests

### 1. `src/game/habiti/resourceGainBonusState.test.ts`

Must verify:

- canonical key generation is stable,
- authored resource enumeration is unique and sorted,
- missing values read as `0`.

### 2. `src/game/habiti/resolveResourceGainBonusBreakdown.test.ts`

Must verify:

- matching effects are filtered by resource,
- multiple effects on one Habitus are aggregated into one contribution entry,
- authored descriptions are preserved in authored order,
- contributions are sorted by label then id,
- unknown Habiti ids are ignored without corrupting totals.

### 3. `src/game/habiti/enqueueResourceGainBonusStateSync.test.ts`

Must verify:

- one hidden `UPDATE_STATE` command is enqueued per authored resource,
- absent resources are reset to `0`,
- `visible` is always `false`,
- unknown owned Habiti ids trigger explicit error logging if logger is provided.

### 4. `src/engine/compiler/abilities/resourceGainAmountKeys.test.ts`

Must verify:

- production base/final keys are deterministic,
- conversion input keys are deterministic,
- conversion output base/final keys are deterministic,
- no two helpers collide for the same identifiers.

### 5. `src/engine/compiler/abilities/productionCompiler.test.ts`

Update to verify:

- compiled production still creates the existing final runtime rule,
- new hidden base amount state exists,
- passive effects derive the final amount from base amount plus global bonus state,
- behavior rule still references the final amount state path.

### 6. `src/engine/compiler/abilities/conversionCompiler.test.ts`

Update to verify:

- conversion inputs still compile to unchanged input amount refs,
- conversion outputs compile to base and final output amount states,
- passive effects derive final output amounts from base output amounts plus global bonus state,
- conversion rule output actions reference final output refs,
- conversion rule input conditions and input `SUB` actions still reference unchanged input refs.

### 7. `src/ui/runtime/world/selection/job-card/resourceGainTooltipLines.test.ts`

Must verify:

- tooltip lines include required `Base` and `Final` lines,
- no-bonus state renders `Bonuses: none`,
- contribution ordering is deterministic,
- authored descriptions are emitted after the matching contribution line,
- formatting is stable for production, conversion output, and preview contexts.

## Command-handler tests

### 8. `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.test.ts`

Must verify:

- it delegates normal cave updates correctly,
- it enqueues hidden bonus-state sync commands after owned-Habiti changes,
- it resets removed resource bonus keys to `0`,
- it preserves engine-handler error behavior for missing entity and missing cave.

### 9. `src/game/handlers/AbsorbBatchHandler.test.ts`

Update to verify:

- absorption no longer mutates `world.cave.ownedHabiti` directly inside processing,
- it enqueues `UPDATE_CAVE` when owned Habiti changed,
- the final owned-Habiti list is sorted and deduplicated,
- existing absorption metadata behavior remains unchanged.

## Integration tests

### 10. Generic production runtime integration test

Add an integration test in the production/runtime domain that verifies:

Given:

- a producer blueprint with a generic `production` ability for a resource,
- a world with cave-owned Habiti that grant a bonus for that resource,
- synchronized hidden world bonus state,

When:

- passive effects and behavior execute for the producer,

Then:

- the final production amount state equals `base * (1 + delta)`,
- the produced resource mutation or transfer uses that final amount.

### 11. Generic conversion runtime integration test

Add an integration test in the conversion/runtime domain that verifies:

Given:

- a converter blueprint with conversion inputs and outputs,
- a world with cave-owned Habiti that grant a bonus for one output resource,
- synchronized hidden world bonus state,

When:

- passive effects and behavior execute for the converter,

Then:

- output final amount state equals `base * (1 + delta)`,
- output `ADD` actions use that final amount,
- input conditions and input `SUB` actions still use the unchanged input amount.

### 12. Hydration integration test

Add a persistence/runtime integration test that verifies:

Given:

- a hydrated runtime whose save data predates the new derived world bonus state,

When:

- load-game hydration completes,

Then:

- the post-hydrate `UPDATE_CAVE` synchronization recreates the hidden world bonus state,
- generic production sees the expected bonus without requiring a further cave mutation,
- generic conversion outputs see the expected bonus without requiring a further cave mutation.

## View tests

### 13. `src/ui/runtime/world/selection/job-card/JobCard.test.tsx`

Update to verify:

- production row shows the adjusted value,
- conversion output row shows the adjusted value,
- conversion input row remains unchanged,
- tooltips include base, contribution lines, authored descriptions, and final for affected values,
- unaffected rows still render correctly.

### 14. `src/ui/runtime/world/selection/job-card/nextCycleHeaderLines.test.ts`

Update to verify:

- conversion header lines that include positive outputs carry tooltip metadata,
- header-line tooltip ordering for multiple outputs is deterministic,
- input-only spans do not receive bonus tooltip metadata.

### 15. `src/ui/runtime/habiti/HabitiGainDisplay.test.tsx`

Add or update to verify:

- resource rows render through `AbilityEffectList`,
- adjusted preview amount is displayed,
- each resource row has tooltip content with the required breakdown,
- empty preview still renders the existing no-gains message correctly.

### 16. `src/ui/runtime/world/selection/absorption/useBodySelector.test.ts`

Add or update to verify:

- preview computes base and final resource rows correctly,
- preview breakdown uses owned cave Habiti contributions,
- zero-bonus preview produces `Bonuses: none` tooltips.

---

## Rejected alternatives

### Rejected: change passive-effect or value-resolution logic to read arbitrary foreign entity paths

Reason:

- unnecessary engine-level surface-area increase,
- existing `global.*` path already solves the requirement.

### Rejected: add a permanent reconciliation system for cave-owned Habiti bonus state

Reason:

- continuous runtime cost for event-driven data,
- duplicated ownership of the same derived state,
- avoidable given existing command-drain semantics.

### Rejected: let `JobCard` compute final production or conversion output amounts itself

Reason:

- would create a second source of truth,
- risks drift between runtime output and displayed output.

### Rejected: apply resource-gain bonuses to conversion inputs

Reason:

- the effect name and existing semantics are about resource gains,
- input requirements and input consumption are not gains,
- changing inputs would create new gameplay semantics beyond the requested feature.

### Rejected: keep `HabitiGainDisplay` resource output as freeform text

Reason:

- cannot wrap individual values in `SmartTooltip`,
- cannot provide deterministic per-resource breakdowns,
- duplicates rendering behavior already solved by `AbilityEffectList`.

---

## Implementation completion criteria

The implementation is complete only when all of the following are true:

- generic production runtime consumes cave-owned resource gain bonuses,
- generic conversion outputs consume cave-owned resource gain bonuses,
- generic conversion inputs remain unchanged,
- `JobCard` shows adjusted production amounts,
- `JobCard` shows adjusted conversion output amounts,
- `HabitiGainDisplay` shows adjusted preview resource rows,
- every affected displayed value is wrapped by the existing tooltip path,
- tooltip breakdowns use authored Habiti effect descriptions,
- no permanent sync system exists,
- no passive-effect engine semantics were expanded,
- hydration restores derived world bonus state,
- tests cover happy path, negative path, and edge cases according to project testing standards.
