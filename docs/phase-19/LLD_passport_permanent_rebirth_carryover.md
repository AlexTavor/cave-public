# LLD — Passport Permanent Toggle with Rebirth Carryover

## 1. Scope

This document defines the implementation of one feature:

- add a `Permanent` toggle to Passport Ability
- entities marked by that toggle continue between runs
- for those entities, only current `state` and current physics are preserved
- all other entity data is rebuilt from the current blueprint on the next run

This design is intentionally narrow.

## 2. Governing constraints

This design is constrained by the uploaded project contract documents and the existing codebase behavior:

- blueprints remain structural templates
- runtime is disposable and may be rebuilt
- no speculative generalization is allowed
- no unrelated refactors are allowed
- tests must follow the existing unit / integration / view split

## 3. Existing code basis

The design is grounded in the current code.

### 3.1 Passport authoring and compilation

Current Passport authoring and compilation live in:

- `src/data/schemas/abilities/passport.ts`
- `src/engine/compiler/abilities/passportCompiler.ts`
- `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

Current Passport compiles display data and optional parent data. It does not currently mark a blueprint for cross-run carryover.

### 3.2 Existing runtime rebuild and rebirth carryover

Current rebirth behavior lives in:

- `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`

That command already carries selected world-owned data across rebirth:

- `sys_world.cave`
- `sys_world.permanent`

It does this by extracting from the old runtime, running the bootstrap script, then reapplying into the new runtime.

### 3.3 Existing persistence primitives

Current save / hydrate logic already contains the exact mechanics needed for this feature:

- `src/engine/runtime/persistence/RuntimeSerializer.ts`
- `src/engine/runtime/persistence/hydrateRuntime.ts`
- `src/engine/runtime/persistence/flyweightPersistence.ts`
- `src/engine/runtime/persistence/flyweightStatePersistence.ts`

Relevant existing behavior:

- `saveState(...)` persists only runtime-owned state values and strips blueprint definition-only state metadata
- `hydrateFlyweightEntity(...)` rebuilds from blueprint base, then overlays saved runtime state
- `hydrateRuntime(...)` restores physics separately from entity hydration
- physics restore already uses `PhysicsComponentSchema` and `buildPhysicsBody(...)`

### 3.4 Existing runtime replacement paths

Current runtime replacement paths are:

- `game.rebirth` via `gameRebirthCommand.ts`
- full save/load via `RuntimeSerializer.ts` and `hydrateRuntime.ts`
- raw runtime reset via `gameResetCommand.ts` and `resetRuntimeState(...)`
- runtime reload via `runtimeReloadCommand.ts` and `useRuntimeStore.loadCartridge(...)`

Only `game.rebirth` currently has explicit, selective carryover logic.

## 4. Locked decisions

The following decisions are fixed for this implementation.

### 4.1 Meaning of “between runs”

For this feature, “between runs” means the runtime replacement performed by `game.rebirth`.

This feature does **not** change:

- save/load behavior
- `game.reset`
- `runtime.reload`
- project load / unload

Rationale:

- `game.rebirth` is the only existing run-replacement path that already carries selective data into the next run
- save/load already preserves complete runtime state and therefore does not need this feature
- broadening the feature to unrelated runtime replacement paths would be scope expansion

### 4.2 Data preserved across rebirth

For Permanent Passport entities, the next run preserves only:

- `state`
- physics body state

The next run does **not** preserve:

- `body`
- `traits`
- `assignment`
- `automation`
- `run`
- `permanent`
- `thought`
- `parent`
- `powerSource`
- `powerSink`
- `cave`
- any other stateful component

Those are rebuilt from the current compiled blueprint in the new runtime.

### 4.3 Marker mechanism

Passport `Permanent` compiles to one reserved blueprint tag owned by Passport.

This tag is the only selector used for entity carryover.

No new runtime component is introduced.

### 4.4 Restore mechanism

Permanent entities are **not** respawned through `SPAWN` commands.

They are restored through the same rebuild pattern already used by persistence:

- rebuild from blueprint base
- overlay saved `state`
- restore saved physics body

Rationale:

- `SPAWN` only recreates blueprint defaults and cannot restore runtime `state`
- existing command handlers do not expose a command capable of restoring full physics body state (`velocity`, `acceleration`, `targetId`, `layer`)
- `hydrateRuntime(...)` already performs direct rebuild + physics restore during runtime reconstruction

## 5. Why

The feature exists to keep selected authored entities alive across rebirth without turning blueprints into mutable runtime containers.

This design is the narrowest one that matches the engine:

- the selection mechanism is authored in Passport
- the persisted data is limited to the two runtime facets the user explicitly wants to keep
- all structural and gameplay configuration still comes from the current blueprint
- the implementation reuses existing state-save and physics-restore machinery instead of inventing a second persistence model

This avoids two failure modes:

1. **plain respawn**
   - would lose current runtime `state`
   - would lose current physics motion/targeting

2. **full flyweight carryover**
   - would carry unrelated runtime-owned components across runs
   - would preserve more than requested
   - would increase stale-reference risk unnecessarily

## 6. What

### 6.1 Authored feature contract

Passport gains one new authored field:

- `permanent: boolean`

Semantics:

- `false` or absent: no cross-rebirth carryover behavior
- `true`: entities created from this blueprint are eligible for rebirth carryover

### 6.2 Runtime feature contract

During `game.rebirth`:

1. the old runtime is scanned for runtime entities carrying the reserved Passport Permanent tag
2. for each eligible entity, a carryover snapshot is extracted
3. the bootstrap script is run and creates the new runtime
4. the carryover snapshots are restored into the new runtime
5. existing cave carryover and permanent fact carryover continue unchanged

### 6.3 Carryover snapshot contract

Each carryover entry contains exactly:

- `id`
- `blueprintId`
- saved `state` fragment
- optional serialized physics body

No other component data is carried.

### 6.4 State contract

Saved state must use the existing `saveState(...)` semantics:

- blueprint metadata such as `allowDeposit`, `allowWithdraw`, and `priority` are not persisted
- runtime-owned values such as `value`, `visible`, and `max` continue to follow current save/hydrate rules
- the next run always gets the current blueprint definition plus the saved runtime-owned values

### 6.5 Physics contract

Saved physics must use the existing serialized physics body shape:

- `x`
- `y`
- `velocity`
- `acceleration`
- optional `targetId`
- optional `layer`

Restore must use the existing body-creation and sync logic:

- build from `PhysicsComponentSchema`
- create body via `buildPhysicsBody(...)` if absent
- sync position, velocity, acceleration, target, and layer

## 7. How

## 7.1 End-to-end flow

### Extraction phase — old runtime

Executed inside `gameRebirthCommand` before the bootstrap script runs.

For each runtime entity:

1. select only entities whose runtime `tags` include the reserved Passport Permanent tag
2. require a valid `blueprintId`
3. resolve the current blueprint from the old runtime cartridge
4. save state by comparing runtime `state` against the blueprint’s base `components.state`
5. if the entity has a physics component:
   - require an actual registered physics body
   - serialize physics body using the existing save shape
6. append a carryover entry

### Bootstrap phase

Unchanged.

`gameRebirthCommand` runs the requested script via `run <scriptPath>`.

### Restore phase — new runtime

Executed inside `gameRebirthCommand` after the new runtime exists.

For each carryover entry:

1. require that the target runtime contains the referenced blueprint id
2. require that the target runtime does not already contain the same entity id
3. if a physics snapshot is present, require that the hydrated blueprint still has a valid physics component
4. rebuild the entity from the current blueprint using `hydrateFlyweightEntity(...)` with only `id`, `blueprintId`, and saved `state`
5. add the entity to the runtime world
6. if a physics snapshot is present, restore physics body state

### Existing rebirth steps after restore

Unchanged.

`gameRebirthCommand` continues to:

- enqueue `UPDATE_CAVE`
- enqueue permanent facts via `ADJUST_FACT`
- enqueue `CLEAR_THOUGHT`
- flush commands

## 7.2 Error handling contract

Error handling must be explicit.

### Extraction-side skip reasons

A permanent-tagged entity is skipped from carryover when:

- it has no valid `blueprintId`
- its blueprint cannot be resolved in the old runtime cartridge
- it has a physics component but no registered runtime physics body

### Restore-side skip reasons

A carryover entry is skipped from restoration when:

- the new runtime does not contain its `blueprintId`
- the new runtime already contains its `id`
- a physics snapshot exists but the hydrated blueprint no longer has a valid physics component
- a physics body id conflict already exists in the new runtime

### Reporting contract

`gameRebirthCommand` must not fail the entire rebirth because one or more permanent entities were skipped after the new runtime was created.

Instead:

- rebirth still returns `success` if the script itself succeeded and the new runtime exists
- the success message includes the number of skipped permanent entities when non-zero

This keeps the runtime transition completed while making partial carryover loss explicit.

## 7.3 No-save-load behavior change

This feature does not change `SaveGameData` and does not change save/load semantics.

Reason:

- full save/load already preserves complete runtime state
- the new feature is selective rebirth carryover, not general persistence

## 8. File-by-file design

## 8.1 Change — `src/data/schemas/abilities/passport.ts`

### Responsibility

Defines the authored Passport ability contract.

### Change

Add:

- `permanent: z.boolean().default(false)`
- exported reserved tag constant `PASSPORT_PERMANENT_TAG`

### Logic

The schema change makes the Passport Permanent toggle first-class authored data.
The exported constant is the single source of truth for the compiler and carryover selector.

### Interface

`PassportAbilityConfig` gains one field:

- `permanent: boolean`

No other Passport field changes.

## 8.2 Change — `src/engine/compiler/abilities/passportCompiler.ts`

### Responsibility

Compiles authored Passport configuration into the compiled blueprint.

### Change

Add permanent-tag synchronization.

### Logic

- ensure `draft.tags` exists
- when `config.permanent === true`, ensure `PASSPORT_PERMANENT_TAG` is present exactly once
- when `config.permanent !== true`, ensure `PASSPORT_PERMANENT_TAG` is absent
- do not mutate unrelated tags

### Interface

Inputs remain:

- `draft: Blueprint`
- `config: PassportAbilityConfig`

Outputs remain in-place mutation of `draft`.

Compiled behavior for label, display, body passport data, description, style, and parent remains unchanged.

## 8.3 Change — `src/engine/compiler/abilities/passportCompiler.test.ts`

### Responsibility

Verifies Passport compiler output.

### Added coverage

- adds `PASSPORT_PERMANENT_TAG` when `permanent` is enabled
- removes `PASSPORT_PERMANENT_TAG` when `permanent` is disabled or absent
- does not remove unrelated authored tags
- preserves existing display/body/parent behavior

### Test layer

Unit.

## 8.4 Change — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.tsx`

### Responsibility

Renders Passport authoring UI.

### Change

Add a `BooleanField` bound to:

- `blueprints.<id>._editor.abilities.passport.permanent`

### Logic

The field is an authored toggle only.
It does not perform compilation or runtime logic.

### Interface

New visible form control:

- label: `Permanent`
- tooltip: must state that this carries the entity’s current `state` and physics through rebirth

No other Passport form controls change.

## 8.5 Add — `src/ui/devtools/editors/blueprint/mode/forms/PassportAbilityForm.permanent.test.tsx`

### Responsibility

Verifies the Permanent Passport toggle wiring.

### Coverage

- renders the checkbox for a blueprint with Passport ability
- writing the checkbox updates `_editor.abilities.passport.permanent`
- checkbox defaults to unchecked when absent

### Test layer

View.

## 8.6 Add — `src/engine/runtime/persistence/physicsBodyPersistence.ts`

### Responsibility

Owns reusable physics-body save/restore helpers that currently exist as private logic inside save/hydrate code.

### Change

Extract generic physics persistence helpers from existing save/hydrate code.

### Logic

Expose three helpers:

1. serialize physics body for one entity id
2. sync a physics body from serialized data
3. restore a physics body into a runtime for one entity id

The restore behavior must remain identical to current `hydrateRuntime(...)` behavior.

### Interface

Exports:

- `serializePhysicsBody(runtime, entityId): SerializedPhysicsBody | null`
- `syncPhysicsBody(body, serialized): void`
- `restorePhysicsBody(runtime, entityId, serialized): boolean`

`restorePhysicsBody(...)` returns a boolean success flag.

Success means:

- entity existed
- a valid physics component was available or a physics body already existed
- body state was synchronized

Failure means restore was not performed.

## 8.7 Add — `src/engine/runtime/persistence/physicsBodyPersistence.test.ts`

### Responsibility

Verifies the extracted physics persistence helpers.

### Coverage

- serializes position, velocity, acceleration, targetId, and layer from a registered body
- restores a new body when the entity has a valid physics component and no existing body
- updates an existing body in place
- returns failure when the entity is missing
- returns failure when the entity exists but has no valid physics component and no body

### Test layer

Unit.

## 8.8 Change — `src/engine/runtime/persistence/RuntimeSerializer.ts`

### Responsibility

Serializes full runtime save data.

### Change

Replace its private physics extraction loop with the shared helper from `physicsBodyPersistence.ts`.

### Logic

Behavior must remain unchanged.
Only helper ownership changes.

### Interface

Public `serialize(...)` signature remains unchanged.

## 8.9 Change — `src/engine/runtime/persistence/hydrateRuntime.ts`

### Responsibility

Hydrates a fresh runtime from save data.

### Change

Replace its private physics restore logic with the shared helper from `physicsBodyPersistence.ts`.

### Logic

Behavior must remain unchanged.
Only helper ownership changes.

### Interface

Public `hydrateRuntime(...)` signature remains unchanged.

## 8.10 Add — `src/engine/runtime/persistence/passportPermanentCarryover.ts`

### Responsibility

Owns extraction and restoration of Permanent Passport entity carryover for rebirth.

### Logic

This file is the only place that knows:

- how to select permanent entities
- how to save only `state` and physics for those entities
- how to restore those entities into a fresh runtime
- how to report extraction/restore skips explicitly

### Interface

Exports the following data contracts:

- `PassportPermanentCarryoverEntry`
  - `id: string`
  - `blueprintId: string`
  - `state?: RuntimeEntity["state"]`
  - `physics?: SerializedPhysicsBody`

- `PassportPermanentCarryoverIssue`
  - `entityId: string`
  - `phase: "extract" | "restore"`
  - `reason: "missing_blueprint_id" | "missing_source_blueprint" | "missing_source_physics_body" | "missing_target_blueprint" | "target_id_conflict" | "target_physics_conflict" | "invalid_target_physics_component"`

- `PassportPermanentCarryoverSnapshot`
  - `entries: PassportPermanentCarryoverEntry[]`
  - `issues: PassportPermanentCarryoverIssue[]`

Exports the following functions:

- `extractPassportPermanentCarryover(runtime): PassportPermanentCarryoverSnapshot`
- `restorePassportPermanentCarryover(runtime, snapshot): PassportPermanentCarryoverIssue[]`

### Extraction rules

- select runtime entities whose runtime `tags` include `PASSPORT_PERMANENT_TAG`
- ignore entities without the tag
- coerce and validate `blueprintId`
- resolve old blueprint from `runtime.getCartridge().blueprints`
- save state by calling `saveState(oldBlueprint.components.state, entity.state)`
- when the entity has a `physics` component, require `serializePhysicsBody(...)` to succeed
- append entry even when state is empty and physics is absent, as long as the entity is valid for carryover

### Restore rules

- fail on target id conflict if `runtime.getEntity(entry.id)` already exists
- fail on target physics conflict if `runtime.getPhysicsBody(entry.id)` already exists
- require that `runtime.getCartridge().blueprints[entry.blueprintId]` exists
- if `entry.physics` exists, require that the hydrated target blueprint still has a valid physics component
- rebuild the entity with `hydrateFlyweightEntity(...)` using only `id`, `blueprintId`, and `state`
- add the hydrated entity via `runtime.addEntity(...)`
- if `entry.physics` exists, restore it via `restorePhysicsBody(...)`

### Non-goals

This file must not:

- serialize full flyweight entities
- restore non-stateful components
- enqueue runtime commands
- mutate `sys_world.cave` or permanent facts

## 8.11 Add — `src/engine/runtime/persistence/passportPermanentCarryover.test.ts`

### Responsibility

Verifies Permanent Passport carryover extraction and restoration.

### Coverage

Required extraction cases:

- extracts only entities carrying `PASSPORT_PERMANENT_TAG`
- stores only `id`, `blueprintId`, saved `state`, and serialized physics
- uses current blueprint state base when saving `state`
- skips tagged entities with missing `blueprintId`
- skips tagged entities that have a physics component but no registered body

Required restore cases:

- rebuilds entity from current blueprint base and overlays saved state
- restores physics body state exactly
- uses current blueprint label and tags from the new cartridge, not the old runtime
- skips when target blueprint is missing
- skips when target runtime already contains the same entity id
- skips when a physics snapshot exists but the new blueprint lacks a valid physics component

### Test layer

Unit.

## 8.12 Change — `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`

### Responsibility

Owns rebirth command orchestration.

### Change

Extend the command to carry Passport Permanent entities in addition to existing cave and permanent fact carryover.

### Logic

New command order:

1. resolve old runtime
2. extract existing cave carryover
3. extract existing permanent fact carryover
4. extract Passport Permanent entity carryover snapshot
5. run bootstrap script
6. resolve new runtime
7. restore Passport Permanent entity carryover
8. enqueue existing `UPDATE_CAVE`
9. enqueue existing permanent fact adjustments
10. enqueue existing `CLEAR_THOUGHT`
11. flush commands
12. return success content, appending skipped-entity count when non-zero

### Interface

Command name, usage, and primary success/error semantics remain unchanged.

Additional success-content rule:

- when carryover issues are present, success content must include the skipped count

No new terminal command is introduced.

## 8.13 Change — `src/ui/runtime/terminal/commands/gameRebirthCommand.test.ts`

### Responsibility

Verifies rebirth command behavior.

### Added coverage

- carries a Permanent Passport entity from the old runtime into the new runtime
- preserved entity keeps the same `id`
- preserved entity restores saved `state`
- preserved entity restores physics body state
- preserved entity uses the new runtime’s current blueprint base for non-stateful data
- existing cave carryover still works
- existing permanent fact carryover still works
- success content includes skipped count when a permanent entity cannot be restored

### Test layer

Integration-style command test using real runtimes, not mocked entity structures.

## 9. Pseudocode

## 9.1 Extraction pseudocode

For each runtime entity:

1. if reserved permanent tag is absent, continue
2. if `blueprintId` is invalid, record extract issue and continue
3. if source blueprint is missing, record extract issue and continue
4. compute saved state using `saveState(...)`
5. if entity has a physics component:
   - serialize registered body
   - if serialization fails, record extract issue and continue
6. append carryover entry with `id`, `blueprintId`, optional saved state, optional physics

## 9.2 Restore pseudocode

For each carryover entry:

1. if runtime already has entity id, record restore issue and continue
2. if runtime already has physics body id, record restore issue and continue
3. if target blueprint is missing, record restore issue and continue
4. if physics snapshot exists and target blueprint has no valid physics component, record restore issue and continue
5. hydrate entity from blueprint base plus saved state
6. add entity to runtime
7. if physics snapshot exists, restore physics body
8. if physics restore fails unexpectedly, record restore issue

## 10. Test plan

## 10.1 Unit tests

Required new or expanded unit coverage:

- Passport compiler permanent tag sync
- extracted reusable physics-body persistence helpers
- Passport Permanent carryover extraction and restoration helpers

These tests must cover:

- happy path
- negative path
- edge cases

## 10.2 Integration-style runtime / command tests

Required integration coverage:

- rebirth carries a permanent entity into the next runtime
- new runtime blueprint changes are reflected in the restored entity’s non-stateful structure
- rebirth still preserves cave and permanent world facts
- restore skips are explicit and visible in command output

Use real `Runtime`, real `ModuleCartridge`, and real world/physics behavior.
Do not mock the ECS world.

## 10.3 View tests

Required view coverage:

- Passport form renders the Permanent toggle
- toggling it writes the exact authored value into the draft store

No complex carryover business logic may be tested in the view layer.

## 11. Non-goals

The following are explicitly out of scope:

- changing save/load semantics
- preserving any component other than `state` and physics for permanent entities
- introducing a generic run-transition framework
- changing `game.reset`
- changing `runtime.reload`
- changing `loadCartridge(...)`
- adding new runtime commands for carryover restore
- preserving entities without a blueprint-backed identity

## 12. Acceptance criteria

The implementation is complete only when all of the following are true:

1. Passport exposes a `Permanent` toggle in the editor.
2. Compiling Passport adds/removes a reserved permanent tag deterministically.
3. `game.rebirth` carries tagged entities into the new runtime.
4. The carried entity keeps the same `id`.
5. Only `state` and physics are preserved; all other data comes from the new blueprint.
6. Save/load behavior is unchanged.
7. Existing cave and permanent fact rebirth carryover remains intact.
8. All skip/failure cases are explicit and surfaced.
9. All new and changed tests pass.
