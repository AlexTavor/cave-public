# LLD: `increase_max_purge` effect type

## 1. Objective

Add a new authored effect type named `increase_max_purge` so it can be used anywhere the shared Habitus/Understanding effect union is used, and make runtime Purge behavior honor it.

This design is based on the uploaded codebase and the project contract documents. It does not assume behavior that is not present in the code.

## 2. Why

The current authored effect system already supports permanent Cave bonuses through a shared discriminated union in `src/data/schemas/game/habiti.ts`. `src/data/schemas/game/understanding.ts` reuses that same union, and the Understanding editor reuses the same effect editor UI. The correct extension point is therefore the shared effect union, not a Habiti-only or Understanding-only mechanism.

The runtime gap is in Purge evaluation:

- `src/game/systems/cave/purgeEvaluate.ts` currently resets `sys_world.state.purge_progress.max` to `config.purge.maxProgress` whenever the stored max differs.
- The same file activates Purge when `purge_progress.value >= config.purge.maxProgress`.
- `src/game/systems/cave/purgeNarrative.ts` computes milestone thresholds from `purge_progress.value / purge_progress.max`.

Because of those three facts, adding a new authored effect without changing Purge runtime would not change gameplay. The authored effect would parse and render, but Purge onset and milestone thresholds would still use the base config max.

## 3. What

### 3.1 New authored effect contract

A new effect variant will be added to the shared Habitus/Understanding effect union.

Effect name:
- `increase_max_purge`

Effect fields:
- `type`: the literal string `increase_max_purge`
- `amount`: finite number
- `description`: string, default empty string

Semantics:
- The effect is additive.
- Total Purge max bonus is the sum of `amount` across all owned Habiti and owned Understanding definitions that contain this effect.
- Effective Purge max equals `config.purge.maxProgress + totalPurgeMaxBonus`.

This change does not introduce a new multiplier model, a new config field, or a new command type.

### 3.2 Runtime contract

When the world owns one or more Habiti or Understanding entries with `increase_max_purge`:

- Purge activation must use the effective Purge max, not the base config max.
- The stored world-state max for `purge_progress` must be synchronized to the effective Purge max.
- Purge narrative milestone ratios must use the effective Purge max.
- The bonus must be stored in hidden world state, using the same hidden-state pattern already used for resource-gain and producer-output bonuses.

### 3.3 Scope

In scope:
- shared authored schema
- authored description generation
- hidden world-state sync for owned cave knowledge
- Purge activation threshold
- Purge narrative threshold computation
- shared effect editor UI
- tests required by the contract

Out of scope:
- renaming existing files purely for naming cleanliness
- adding new config under `config.purge`
- changing the default authored effect in the editor
- refactoring unrelated bonus aggregation paths
- changing resource-gain or producer-output logic

## 4. Existing mechanisms to reuse

The implementation must reuse the following existing mechanisms rather than introducing parallel systems:

- Shared effect union in `src/data/schemas/game/habiti.ts`
- Understanding effect reuse through `src/data/schemas/game/understanding.ts`
- Shared authoring UI through `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx` and `HabitusEffectsSection.tsx`
- Shared cave-knowledge aggregation through `src/game/habiti/resolveOwnedCaveKnowledgeEffects.ts`
- Hidden world-state sync through `src/game/habiti/enqueueResourceGainBonusStateSync.ts`
- Hidden-state key helper pattern already used by `resourceGainBonusState.ts` and `producerOutputBonusState.ts`
- Purge runtime entry points already used by `CaveSystem` and `PurgeNarrativeSystem`
- Existing `UPDATE_STATE` max-update behavior in `src/engine/runtime/handlers/UpdateStateHandler.ts`

No direct ECS mutation may be introduced outside the existing command pipeline.

## 5. File-by-file design

### 5.1 New file: `src/game/habiti/purgeProgressBonusState.ts`

Responsibility:
- Own the hidden world-state key and read helper for the Purge max bonus.

Why this file must exist:
- Resource gain and producer output bonuses already isolate state-key naming and read logic into dedicated files.
- Purge max bonus needs the same isolation so the literal state key does not spread across systems and handlers.

Public interface:
- Export a single canonical hidden-state key with exact value `habiti_purge_progress_max_bonus`
- Export a read helper that accepts a world-like object and returns the numeric hidden bonus, defaulting to `0`

Logic:
- Read from `world.state[habiti_purge_progress_max_bonus].value`
- Return the numeric value when present
- Return `0` when the entry is missing or non-numeric

Invariants:
- The entry is hidden state only
- Missing state is equivalent to zero bonus

### 5.2 Changed file: `src/data/schemas/game/habiti.ts`

Responsibility:
- Define the shared authored effect union used by both Habiti and Understanding.

Required change:
- Add a new discriminated-union member for `increase_max_purge`

Interface after change:
- `HabitusEffectSchema` must accept the new effect shape
- `HabitusEffect` type must include the new variant

Logic:
- Reuse the existing `finiteNumber` and `displayDescription` helpers
- Do not introduce effect-specific numeric validation beyond what the file already applies to other effect types

Why this is sufficient for Understanding:
- `src/data/schemas/game/understanding.ts` imports `HabitusEffectSchema` directly, so Understanding support is inherited automatically

### 5.3 Changed file: `src/game/habiti/generateHabitusEffectDescription.ts`

Responsibility:
- Generate deterministic authored descriptions for effect rows in the devtools editor.

Required change:
- Add a new success branch for `increase_max_purge`

Interface after change:
- Input remains `HabitusEffect`
- Output remains `HabitusEffectDescriptionResult`
- No new failure reason is introduced

Logic:
- Return a successful description for the new effect with exact text shape `+<amount> max purge progress`
- The new effect does not depend on any extra authored fields, so generation must never fail for this effect type

Invariants:
- Description generation remains deterministic for identical input
- Existing failure modes remain limited to missing `resource` and missing `producerTag`

### 5.4 Changed file: `src/game/habiti/resolveOwnedCaveKnowledgeEffects.ts`

Responsibility:
- Aggregate owned Habiti and Understanding effects into runtime totals for Cave-level behavior.

Required change:
- Extend the aggregation result with `purgeProgressMaxBonus`
- Sum `increase_max_purge.amount` across all resolved definitions

Interface after change:
- Existing return fields stay unchanged
- One new numeric return field is added: `purgeProgressMaxBonus`

Logic:
- Initialize `purgeProgressMaxBonus` to `0`
- When an effect has type `increase_max_purge`, add its `amount` to `purgeProgressMaxBonus`
- Preserve existing sorted-id and unknown-id handling exactly as-is

Invariants:
- Bonus aggregation remains additive
- Duplicate owned ids remain normalized by existing sort/dedup behavior
- Unknown ids continue to report through the existing callbacks and must not throw

### 5.5 Changed file: `src/game/habiti/enqueueResourceGainBonusStateSync.ts`

Responsibility today:
- Synchronize hidden world state derived from owned Habiti and owned Understanding after ownership changes.

Required change:
- Extend the existing sync to also write the hidden Purge max bonus state

Why this file changes instead of adding a parallel sync entry point:
- Both `GainUnderstandingHandler` and `UpdateCaveWithResourceGainBonusHandler` already call this file after ownership changes
- Reusing the same sync hook avoids new command plumbing and preserves the existing ownership-update contract

Interface after change:
- Function signature remains unchanged
- Call sites remain unchanged

Logic:
- After resolving cave knowledge effects, enqueue one additional `UPDATE_STATE` command for `sys_world`
- Command payload must set:
  - `key` to `habiti_purge_progress_max_bonus`
  - `value` to `resolved.purgeProgressMaxBonus`
  - `visible` to `false`
- Existing resource and producer bonus sync behavior remains unchanged

Invariants:
- No sync occurs when `commands` is missing, `world` is missing, or `world.id` is missing
- The sync remains world-state-only and hidden

Naming note:
- The file name is retained even though its responsibility broadens slightly. This avoids unrelated refactor churn.

### 5.6 Changed file: `src/game/systems/cave/purgeResolvers.ts`

Responsibility today:
- Provide small helpers for reading Purge runtime state from the world snapshot.

Required change:
- Add a helper that resolves the effective Purge max from base config max plus hidden state bonus

Interface after change:
- Add a new exported helper with this contract:
  - input: world entity, base config max progress
  - output: effective numeric Purge max

Logic:
- Read the hidden bonus from `purgeProgressBonusState.ts`
- Return `baseConfigMax + hiddenBonus`
- Do not clamp or mutate

Why this helper belongs here:
- Both Purge evaluation and Purge narrative need the same resolved max
- Centralizing the computation prevents threshold drift between systems

### 5.7 Changed file: `src/game/systems/cave/purgeEvaluate.ts`

Responsibility:
- Drive Purge activation, Purge timer progression, kill emission, and synchronization of `purge_progress.max`.

Required changes:
- Replace all direct use of `config.purge.maxProgress` as the runtime threshold with the effective Purge max helper
- Synchronize `purge_progress.max` to the effective Purge max, not the base config max

Interface after change:
- Function signature remains unchanged
- Emitted command types remain unchanged

Logic:
- Resolve `effectiveMaxProgress` from the world snapshot and base config max
- If stored `purge_progress.max` differs from `effectiveMaxProgress`, enqueue `UPDATE_STATE` for key `purge_progress` with `max = effectiveMaxProgress`
- If Purge is inactive, activate when `purge_progress.value >= effectiveMaxProgress`
- If Purge is active, preserve all existing timer and kill behavior

Important runtime behavior:
- Activation uses the computed effective max immediately in the same system tick
- The stored `purge_progress.max` value is updated through the normal command path
- Because `UpdateStateHandler` already owns max-change semantics, this file must not manually clamp `purge_progress.value`

Consequences of existing `UpdateStateHandler` behavior:
- If the effective max decreases, the stored `purge_progress.value` will be clamped down to the new max unless a state entry opts into `preserveValueOnMaxDecrease`
- `purge_progress` does not opt into that preservation today, so the existing clamp behavior remains authoritative

### 5.8 Changed file: `src/game/systems/cave/purgeNarrative.ts`

Responsibility:
- Trigger narrative milestones based on Purge progression.

Required change:
- Compute milestone ratios from the effective Purge max, not the stored snapshot max alone

Why this file must change:
- Without this change, milestone thresholds would continue to use the old denominator until `purge_progress.max` is synchronized in a later apply phase
- That creates a one-tick threshold mismatch between Purge activation and Purge narrative

Interface after change:
- Function signature remains unchanged
- Emitted command type remains unchanged

Logic:
- Continue reading `purge_progress.value` from the snapshot
- Replace the ratio denominator with the effective Purge max helper
- Preserve all existing milestone flagging and deterministic message selection behavior
- Keep the existing guard that no milestone is evaluated when the effective max is less than or equal to zero

### 5.9 Changed file: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`

Responsibility:
- Render the shared authored effect row editor used by both Habiti and Understanding.

Required change:
- Add `increase_max_purge` to the local effect-type enum used by the row

Interface after change:
- The row must accept and render a draft effect whose `type` is `increase_max_purge`

Logic:
- The new type shows no extra field beyond the existing shared `Description` and `Amount` fields
- `Attribute`, `Resource`, and `Producer Tag` inputs must remain hidden for this type
- The existing generated-description field continues to work through `generateHabitusEffectDescription`

Why no other UI file must change:
- `UnderstandingRowEditor.tsx` already delegates to `HabitusEffectsSection`
- `HabitusEffectsSection.tsx` is generic over the shared row component
- `bodyEditorDefaults.ts` may remain unchanged because the default authored effect stays `add_cave_attribute`

## 6. Files intentionally unchanged

### 6.1 `src/data/schemas/game/understanding.ts`

No change is required.

Reason:
- It already reuses `HabitusEffectSchema`, so the new effect becomes valid for Understanding automatically once the shared schema changes.

### 6.2 `src/game/handlers/GainUnderstandingHandler.ts`

No source change is required.

Reason:
- It already calls the hidden-state sync hook after adding owned Understanding to `sys_world`.
- Extending that sync hook is sufficient.

### 6.3 `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.ts`

No source change is required.

Reason:
- It already calls the hidden-state sync hook after owned Habiti or owned Understanding updates on `sys_world`.
- Extending that sync hook is sufficient.

### 6.4 `src/ui/devtools/editors/config/understanding/UnderstandingRowEditor.tsx`

No change is required.

Reason:
- It already uses the shared Habitus effects section.

### 6.5 `src/ui/devtools/editors/config/body/bodyEditorDefaults.ts`

No change is required.

Reason:
- The task is to add a new effect type, not to change the default newly-created effect.

### 6.6 `src/game/habiti/resolveResourceGainBonusBreakdown.ts` and `src/game/habiti/resolveOwnedHabitiEffects.ts`

No change is required.

Reason:
- These files serve narrower responsibilities tied to resource-gain and producer-output views.
- The new Purge effect is intentionally irrelevant to those outputs.

## 7. End-to-end runtime flow

1. An author adds `increase_max_purge` to a Habitus or Understanding definition.
2. The shared schema accepts it because it is part of `HabitusEffectSchema`.
3. The shared editor row can render and edit it because the row enum now includes the type.
4. When `sys_world` ownership changes, the existing hidden-state sync path recomputes all cave-knowledge-derived totals, including the new Purge max bonus.
5. The sync path writes hidden state `habiti_purge_progress_max_bonus` to `sys_world.state` with `visible: false`.
6. During Purge evaluation, runtime computes `effectiveMax = config.purge.maxProgress + hiddenBonus`.
7. Purge activation compares progress against `effectiveMax`.
8. Purge max synchronization writes `purge_progress.max = effectiveMax` through `UPDATE_STATE`.
9. Purge narrative milestone ratios also use `effectiveMax`.

## 8. Timing and phase contract

This implementation must respect the existing runtime phase model.

Relevant facts from the current runtime:
- Command handlers run in apply phase.
- The command manager continues draining until the command buffer is empty.
- Systems run later against the snapshot built after apply phase.

Resulting behavior for this feature:
- If ownership changes through a command handler, the hidden Purge max bonus state is synchronized during the same apply phase.
- The snapshot used by `CaveSystem` and `PurgeNarrativeSystem` in that tick already contains the updated hidden bonus state.
- Purge activation and milestone ratio logic therefore use the new bonus immediately.
- The visible `purge_progress.max` field is still synchronized through the normal system-command path and is applied in the next apply phase, which is consistent with existing system behavior.

## 9. Test plan

The test plan follows the uploaded testing standard: behavior-focused, readable, and colocated.

### 9.1 Unit tests

#### Add: `src/game/habiti/purgeProgressBonusState.test.ts`

Cases:
- Returns the exact hidden-state key name
- Reads a numeric bonus from world state
- Returns `0` when the entry is missing
- Returns `0` when the entry exists but the value is non-numeric

#### Change: `src/game/habiti/generateHabitusEffectDescription.test.ts`

Add case:
- Given `increase_max_purge` with a numeric amount
- When description is generated
- Then the result is successful and equals the exact agreed string shape

#### Change: `src/game/habiti/resolveOwnedCaveKnowledgeEffects.test.ts`

Add cases:
- Aggregates Purge max bonuses from Habiti and Understanding together
- Reports unknown ids without affecting Purge max aggregation
- Keeps existing resource and attribute aggregation unchanged while adding the new Purge total field

### 9.2 Integration tests

#### Change: `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.test.ts`

Add case:
- Given a Habitus with `increase_max_purge`
- When owned Habiti are updated on `sys_world`
- Then hidden state sync emits `UPDATE_STATE` for `habiti_purge_progress_max_bonus` with the summed value and `visible: false`

#### Change: `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.understanding.test.ts`

Add case:
- Same as above, but sourced from Understanding

#### Change: `src/game/handlers/GainUnderstandingHandler.test.ts`

Add case:
- Given Understanding with `increase_max_purge`
- When the understanding is gained on `sys_world`
- Then the handler adds the owned understanding, emits mirrored facts exactly as today, and also emits the hidden Purge max bonus state sync command

#### Change: `src/game/systems/cave/purgeEvaluate.test.ts`

Add cases:
- Given base config max `100` and hidden bonus `50`, when Purge is evaluated, then it enqueues `UPDATE_STATE` to set `purge_progress.max` to `150`
- Given progress value `100` and effective max `150`, when Purge is evaluated, then Purge does not activate
- Given progress value `150` and effective max `150`, when Purge is evaluated, then Purge activates and still emits the existing `purge_began` facts
- Given a smaller effective max than the stored max, when Purge is evaluated, then the file still uses the effective max for activation and max synchronization, without introducing manual value clamping logic in this system

#### Change: `src/game/systems/cave/purgeNarrative.test.ts`

Add cases:
- Given base config max `100`, hidden bonus `50`, milestone threshold `0.3`, and progress value `30`, when narrative is evaluated, then the milestone does not fire because the effective ratio is `0.2`
- Given the same setup with progress value `45`, when narrative is evaluated, then the milestone does fire because the effective ratio is `0.3`

### 9.3 View tests

#### Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.test.tsx`

Add case:
- Given a draft effect with type `increase_max_purge`
- When the row renders
- Then it renders successfully, shows the shared `Amount` and `Description` controls, and does not show `Attribute`, `Resource`, or `Producer Tag`

#### Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.generateDescription.test.tsx`

Add case:
- Given a draft effect with type `increase_max_purge`
- When the user clicks `Generate Description`
- Then only the description field is updated with the exact generated text and no other draft fields change

## 10. Acceptance criteria

Implementation is complete only when all of the following are true:

- `increase_max_purge` is accepted by the shared Habitus/Understanding effect schema
- The shared effect editor row can author the new type
- The description generator supports the new type deterministically
- Hidden world state stores the summed Purge max bonus using a single canonical key
- Purge activation uses the effective max, not the base config max
- Purge narrative thresholds use the effective max, not the stored snapshot max alone
- Existing hidden-state sync behavior for resource and producer bonuses remains unchanged
- No direct state mutation is introduced outside the command pipeline
- The added and changed tests described above pass

## 11. Non-ambiguous implementation decisions

These decisions are locked for this task:

- The effect is additive, not multiplicative
- The hidden world-state key is exactly `habiti_purge_progress_max_bonus`
- The effective Purge max formula is exactly `config.purge.maxProgress + totalPurgeMaxBonus`
- The hidden bonus state is written with `visible: false`
- The new effect is supported by both Habiti and Understanding through the shared schema path
- `purgeEvaluate.ts` and `purgeNarrative.ts` both use the same effective-max computation source
- No handler entry point or command type is added
- No file is renamed solely for cleanup
