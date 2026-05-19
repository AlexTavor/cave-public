# LLD — Resource Gain Bonus Fixes for `UPDATE_CAVE` Synchronization and Job Card Conversion Output Breakdown

## Purpose

Fix the two verified defects in the current implementation of cave-owned `add_resource_gain_multiplier` support:

1. hidden world bonus-state synchronization is currently attached to every `UPDATE_CAVE` command, which creates unnecessary command fan-out and runs after unrelated or failed cave updates,
2. conversion-output tooltip breakdowns in `JobCard` can read the wrong base output amount when an earlier authored output is compiled but not rendered because its resolved runtime amount is non-positive.

This design is constrained by the uploaded contract documents and by the current repository code. It must preserve the command pipeline, keep UI presentation-only, avoid speculative refactors, and reuse the existing runtime/UI mechanisms that already solve the rest of the feature.

## Authoritative inputs

This design is based on the uploaded source tree and these uploaded project documents:

- `context-pack.md`
- `prompt-contract.md`
- `testing-standards.md`
- `resource_gain_bonus_lld_v3.md`

## Why

## Verified defect 1 — bonus-state synchronization currently runs on unrelated `UPDATE_CAVE` traffic

Observed code:

- `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.ts` delegates to `UpdateCaveHandler`, then unconditionally resolves `sys_world` and calls `enqueueResourceGainBonusStateSync(...)`.
- `src/game/systems/CaveMindSystem.ts` enqueues `UPDATE_CAVE` every tick with only `mind` in the payload.
- Other existing paths also enqueue `UPDATE_CAVE` without touching owned Habiti, including progression, purge, draft skillpoint spend, and cave-attribute mutation.
- `src/engine/runtime/CommandsManager.ts` drains commands until the queue is empty inside one apply pass.

Current effect:

- every mind-only `UPDATE_CAVE` emitted by `CaveMindSystem` causes one `UPDATE_STATE` command per authored resource-gain bonus resource,
- those hidden state updates are unrelated to the command that triggered them,
- if an `UPDATE_CAVE` command fails for a missing or invalid target entity, the wrapper still resolves `sys_world` and can enqueue bonus-state updates anyway.

This violates the intended event-driven synchronization contract and introduces avoidable per-tick command amplification.

## Verified defect 2 — conversion output tooltip base lookup can drift from authored output order

Observed code:

- `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainEffects.ts` iterates conversion `MUTATE` actions.
- For output actions (`ADD`), it reads the base output amount from `conversionOutputBaseAmountKey(resource, sourceIndex, outputIndex)`.
- `outputIndex` is incremented only when the current output survives the `amount > 0` display filter.

Current effect:

- if authored output `0` resolves to `0` or a negative value and is filtered out,
- authored output `1` becomes the first rendered positive output,
- the tooltip for authored output `1` reads base key index `0` instead of `1`.

The displayed final number remains correct because the final amount comes from the compiled runtime ref. The defect is in the tooltip breakdown contract: the UI can explain the correct final number using the wrong base amount and therefore the wrong delta.

## Why these are the only fixes in scope

The rest of the implementation already satisfies the current fix scope:

- production runtime final amounts are compiled through final state refs,
- conversion inputs remain unchanged and conversion outputs use final refs,
- absorption-owned-Habiti updates already route through `UPDATE_CAVE` via `enqueueOwnedHabitiUpdate`,
- hydration already replays `UPDATE_CAVE` once after `hydrate`,
- `HabitiGainDisplay` already reuses `AbilityEffectList`,
- header-line tooltips already derive from effect-row tooltip metadata.

No additional compiler, persistence, or UI renderer changes are required to fix the verified defects.

## What

## Functional requirements

### R1. Hidden resource-gain bonus state synchronization must run only for owned-Habiti cave updates

`UpdateCaveWithResourceGainBonusHandler` must enqueue bonus-state synchronization only when all of the following are true:

1. the handled command is `UPDATE_CAVE`,
2. `command.payload.entityId === "sys_world"`,
3. `command.payload.ownedHabiti` is present and is an array,
4. after base-handler execution, `sys_world` still exists and still has a cave component.

If any of these conditions are false, the wrapper must not enqueue any `UPDATE_STATE` bonus-sync commands.

### R2. The wrapper must preserve existing `UpdateCaveHandler` behavior

The wrapper must continue to delegate all normal cave mutation work to `UpdateCaveHandler`.

It must not:

- change the `UPDATE_CAVE` payload schema,
- change cave mutation semantics,
- suppress or replace the base handler’s existing error logging.

### R3. Existing owned-Habiti mutation paths must continue to synchronize bonus state

The following existing paths must still trigger bonus-state synchronization because they already enqueue `UPDATE_CAVE` with `ownedHabiti`:

- absorption completion via `enqueueOwnedHabitiUpdate`,
- save-game load via `ui/runtime/state/persistenceSlice.ts`,
- rebirth via `ui/runtime/terminal/commands/gameRebirthCommand.ts`.

No new command type and no periodic reconciliation system are allowed.

### R4. Conversion output tooltip breakdowns must use authored output order, not rendered-output order

In `jobAnalysis.resourceGainEffects.ts`, the base output amount lookup for a conversion output must be keyed by the output’s authored output ordinal within the compiled conversion rule.

That ordinal must advance for every output `ADD` action encountered in rule order, regardless of whether the output is later rendered.

### R5. The displayed final output amount must remain runtime-sourced

The fix must not change the displayed final amount contract.

For conversion outputs:

- the displayed value must continue to come from the compiled runtime final output amount ref,
- the fix applies only to the UI-side base-amount lookup used to explain that displayed value.

### R6. No schema or renderer expansion is allowed

This fix must not:

- add a new reconciliation system,
- change `BehaviorRule` schema,
- change passive-effect or global-state semantics,
- add a parallel tooltip renderer,
- change `AbilityEffectList`, `AbilityInlineDisplayLine`, or `SmartTooltip` contracts.

## Explicit non-goals

- No change to `resourceGainAmountKeys.ts` key format.
- No change to compiler output ids or rule ids.
- No change to production runtime math.
- No change to conversion input semantics.
- No change to absorption runtime math.
- No change to persistence flow beyond the existing post-hydrate `UPDATE_CAVE` replay.
- No attempt to remove all rule-id parsing from job-card analysis. The current compiled behavior schema does not carry separate authored-index metadata, and widening that schema is outside this fix set.

## How

## High-level approach

The fix is implemented in two production files and two test files.

1. Guard bonus-state synchronization in the `UPDATE_CAVE` wrapper so it runs only on owned-Habiti updates for `sys_world`.
2. Correct the conversion-output authored output index tracking in the job-card resource-gain effect builder.
3. Add focused tests that lock the new behavior.

No other runtime, compiler, or UI files are changed.

## File-by-file design

### 1. Change `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.ts`

#### Responsibility

Own the game-specific `UPDATE_CAVE` wrapper that appends resource-gain bonus-state synchronization to the base engine cave-update handler.

#### Logic

The handler must execute in this order:

1. delegate the incoming command to the existing engine `UpdateCaveHandler`,
2. read `ownedHabiti` from `command.payload`,
3. if `ownedHabiti` is not an array, return immediately,
4. if `command.payload.entityId !== "sys_world"`, return immediately,
5. resolve the entity whose id is exactly `command.payload.entityId`,
6. if that entity does not exist, return,
7. if that entity has no cave component, return,
8. call `enqueueResourceGainBonusStateSync` with that entity and the existing Habiti index.

This keeps the wrapper event-driven and aligned with the existing global-state contract, because `Snapshot.getGlobal(...)` reads hidden state only from `sys_world.state`.

#### Interface

- Command type remains `RuntimeCommandType.UPDATE_CAVE`.
- Command payload remains unchanged.
- No new exports are introduced.
- No new command types are introduced.

#### Required invariants

- mind-only, progression-only, purge-only, skillpoint-only, and attribute-only `UPDATE_CAVE` commands enqueue zero resource-gain bonus sync commands,
- failed `UPDATE_CAVE` commands enqueue zero resource-gain bonus sync commands,
- owned-Habiti updates for `sys_world` still enqueue one hidden `UPDATE_STATE` per authored resource-gain bonus resource.

### 2. Change `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainEffects.ts`

#### Responsibility

Build production and conversion `AbilityEffectModel` entries for `JobCard`, including tooltip metadata for resource-gain bonus breakdowns.

#### Logic

The production path remains unchanged.

The conversion path changes only in how it tracks authored output ordinals:

1. keep iterating `rule.actions` in rule order,
2. maintain an `outputOrdinal` counter that represents the authored output position,
3. when the current action is a conversion output (`MUTATE` with `op === "ADD"` and a state target other than cycle), capture the current ordinal for that action,
4. increment `outputOrdinal` immediately after capturing it,
5. only then apply the existing display filter (`amount === null` or `amount <= 0`),
6. if the output is rendered, read the base amount from `conversionOutputBaseAmountKey(resource, sourceIndex, capturedOutputOrdinal)`,
7. build tooltip metadata from that base amount and the runtime final amount exactly as today.

Input actions remain unchanged.

This preserves the authored output index even when earlier compiled outputs are skipped by the display filter.

#### Interface

- Exported function signatures remain unchanged.
- `AbilityEffectModel` shape remains unchanged.
- `AbilityEffectGroup` shape remains unchanged.
- No new props or React contracts are introduced.

#### Required invariants

- a hidden or zero-valued earlier output does not shift the base-key lookup for later positive outputs,
- visible outputs continue to appear in authored rule order,
- displayed final output values continue to use the runtime final amount ref,
- negative input rows remain unchanged.

### 3. Change `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.test.ts`

#### Responsibility

Verify the `UPDATE_CAVE` wrapper’s synchronization guards and retained owned-Habiti sync behavior.

#### Logic

This file must contain explicit Given/When/Then tests for all of the following cases:

1. **owned-Habiti update on `sys_world`**
   - Given a valid `sys_world` cave entity and Habiti config with at least one resource-gain bonus,
   - When `UPDATE_CAVE` is handled with `ownedHabiti`,
   - Then the handler enqueues the expected hidden `UPDATE_STATE` bonus-sync command set.

2. **mind-only update**
   - Given the same valid world entity,
   - When `UPDATE_CAVE` is handled with only `mind`,
   - Then the handler enqueues no bonus-sync commands.

3. **missing target entity**
   - Given a context where `sys_world` exists but the command payload points to a missing entity id,
   - When the wrapper handles the command,
   - Then the base handler error path remains intact and the wrapper enqueues no bonus-sync commands.

4. **target entity without cave component**
   - Given a target entity id that resolves but has no cave component,
   - When the wrapper handles the command,
   - Then the wrapper enqueues no bonus-sync commands.

#### Interface

- Test file only.
- No production exports.
- Uses existing handler test utilities.

### 4. Add `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainEffects.test.ts`

#### Responsibility

Lock the authored-output-index contract for conversion tooltip breakdowns and confirm unchanged production behavior.

#### Logic

This file must contain explicit Given/When/Then tests for all of the following cases:

1. **later visible output keeps its authored output index when an earlier output is hidden**
   - Given a conversion rule with at least two output `ADD` actions in authored order,
   - Given runtime state where the first output’s final amount resolves to `0` and the second output’s final amount resolves to a positive number,
   - Given distinct base amounts stored at output base keys `0` and `1`,
   - When `buildConversionGroup(...)` is called,
   - Then only the later positive output is rendered,
   - And its tooltip `Base:` line uses base key index `1`, not `0`.

2. **multiple visible outputs still read their matching base keys**
   - Given two visible positive outputs with distinct base amounts,
   - When `buildConversionGroup(...)` is called,
   - Then each output tooltip uses its own authored base key.

3. **production effect lookup remains unchanged**
   - Given a production rule and matching base/final state values,
   - When `buildProductionEffects(...)` is called,
   - Then the effect still displays the final amount and reads the base amount from the production base key.

#### Interface

- Test file only.
- No production exports.
- Uses existing runtime/entity test factories where available; otherwise uses minimal plain object fixtures that match the helper’s current inputs.

## Files explicitly not changed

These files remain unchanged because the current implementation already satisfies the fix scope:

- `src/game/habiti/enqueueResourceGainBonusStateSync.ts`
  - already computes the correct hidden `UPDATE_STATE` payload set for a given cave-owned Habiti state.

- `src/game/handlers/enqueueOwnedHabitiUpdate.ts`
  - already centralizes absorption-owned-Habiti persistence behind `UPDATE_CAVE` and already suppresses no-op updates.

- `src/ui/runtime/state/persistenceSlice.ts`
  - already replays `UPDATE_CAVE` after hydration with the hydrated `ownedHabiti` list.

- `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`
  - already restores `ownedHabiti` through `UPDATE_CAVE`.

- `src/ui/runtime/world/selection/job-card/nextCycleHeaderLines.ts`
  - already consumes tooltip metadata from effect models; once the effect model tooltip data is corrected, header lines inherit the corrected output breakdown automatically.

- `src/ui/runtime/habiti/HabitiGainDisplay.tsx`
  - already reuses `AbilityEffectList` and does not participate in either verified defect.

## Pseudocode

### `UpdateCaveWithResourceGainBonusHandler.handle`

```text
handle(command, context):
  baseHandler.handle(command, context)

  if payload.ownedHabiti is not an array:
    return

  if payload.entityId is not "sys_world":
    return

  world = find entity by payload.entityId
  if world is missing:
    return

  if world has no cave component:
    return

  enqueueResourceGainBonusStateSync(world, habitusIndex, telemetryLogger)
```

### conversion output authored-index tracking

```text
buildConversionGroup(...):
  outputOrdinal = 0

  for each action in rule.actions in order:
    if action is not a relevant MUTATE action:
      continue

    isOutput = action.op == ADD

    if isOutput:
      authoredOutputOrdinal = outputOrdinal
      outputOrdinal = outputOrdinal + 1

    amount = resolve runtime amount
    if amount is null or amount <= 0:
      continue

    if isOutput:
      baseAmount = read base key using authoredOutputOrdinal
      build positive output tooltip from baseAmount and final amount
    else:
      build unchanged negative input row
```

## Tests

## Unit tests required

### `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.test.ts`

Must verify:

- happy path: owned-Habiti update on `sys_world` enqueues hidden bonus sync commands,
- negative path: mind-only update enqueues none,
- negative path: missing entity enqueues none,
- negative path: entity without cave enqueues none.

### `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainEffects.test.ts`

Must verify:

- edge case: hidden earlier output does not shift later output base lookup,
- happy path: multiple visible outputs map to matching base keys,
- regression: production lookup remains unchanged.

## Existing tests that remain valid without modification

- compiler resource-gain tests,
- absorption processing tests,
- persistence hydration replay path,
- header-line tooltip assembly tests once they exist.

They remain valid because the fix does not change compiler output contracts, absorption routing, or header-line rendering mechanics.

## Completion criteria

The fix is complete only when all of the following are true:

- `UPDATE_CAVE` bonus-state synchronization runs only on `ownedHabiti` updates for `sys_world`,
- `CaveMindSystem` tick traffic no longer causes resource-gain bonus sync command fan-out,
- failed or invalid `UPDATE_CAVE` commands no longer trigger bonus-state synchronization,
- conversion output tooltip `Base:` values match authored output indices even when earlier compiled outputs are filtered out of the UI,
- production effect display behavior remains unchanged,
- no schema, renderer, compiler, persistence, or runtime-loop changes were introduced outside the files listed above,
- all added and updated tests pass and follow the uploaded testing standard.
