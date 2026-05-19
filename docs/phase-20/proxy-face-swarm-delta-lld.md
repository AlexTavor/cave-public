# LLD — Final Proxy / Face / Swarm Detritus Cleanup Delta

## 1. Purpose

This document defines the remaining implementation delta required to complete the cleanup of obsolete proxy, face, and swarm concepts in the current `src4` branch.

This is a **delta LLD**. It does not restate the already-implemented body-owned assignment, pointer ownership, or power-from-Cave work except where those features are still polluted by old model remnants.

This document is grounded in the current `src4` code.

---

## 2. Why this delta is required

The current branch still contains obsolete proxy / face / swarm assumptions in live code, authored data, devtools, terminal commands, saves, and tests.

These remnants are now harmful for four reasons:

1. they preserve dead concepts in active entrypoints and authoring tools
2. they keep the codebase internally inconsistent with the body-owned assignment model
3. they create stale test expectations that teach the wrong runtime behavior
4. they leave misleading editor and terminal routes that target removed mechanics

The remaining cleanup is not optional. It is required to make the codebase consistent with the agreed runtime model.

---

## 3. Locked cleanup decisions

The following are now fixed decisions.

## 3.1 Proxy concept

The gameplay concept of a proxy entity is deleted.

Implications:
- no gameplay handler may spawn, recall, or resolve proxies
- no processing helper may resolve a body via a proxy indirection path
- no selection helper may refer to proxy flags or proxy-derived display
- no terminal command may expose proxy-related operations
- no test may encode proxy behavior as expected runtime behavior

The generic JavaScript `Proxy` language feature used in `engine/logic/JsonLogicAdapter.proxy.ts` is **not** part of this cleanup and remains.

## 3.2 Face / swarm concept

The gameplay concept of face entities and the `sys_swarm` aggregate is deleted.

Implications:
- no system entity named `sys_swarm` exists
- no authored preview system entity named `sys_swarm` exists
- no UI card, selector, or selection lens exists for face or swarm
- no body-identity helper may compute swarm membership or swarm avatars
- no runtime, devtools, or save fixture may rely on face/swarm entities

## 3.3 Processing semantics

Processing remains body-owned and node-local.

Any useful processing-output logic currently trapped in old `absorptionBatch*` helpers must be moved into the live processing path, after which the obsolete helpers are deleted.

## 3.4 Facts / telemetry naming

The `absorption_ongoing` fact is obsolete. The active fact name must reflect the live model, which is processing-on-assigned-bodies.

No runtime fact may refer to `absorption` after this cleanup.

---

## 4. Current branch findings that define the delta

The following remaining remnants exist in current `src4`:

### Active-code remnants
- `game/handlers/ResolveBodyProcessingHandler.ts` still imports old `absorptionBatchFinalization`, `absorptionBatchOutputs`, and `absorptionBatchSpectacle`
- `ui/runtime/terminal/runtimeRegistry.ts` still imports `setTargetCommand` from `commands/absorptionCommands.ts`
- `ui/devtools/editors/blueprint/visuals/previewSystemEntities.ts` still creates `sys_swarm`
- `ui/devtools/editors/file/SystemConfigEditor.tsx` still exposes “Swarm Entity” and “Face Blueprints” routes
- `engine/runtime/runtimeReset.ts` and `engine/runtime/runtimePhysicsSeed.ts` still document `sys_swarm` as a live system entity
- `game/handlers/spawnFromBlueprint.ts` still special-cases `sys_swarm`
- `engine/runtime/handlers/spawnBodyHabiti.ts` still special-cases `sys_swarm`
- `game/systems/FactsSystem.ts` still emits `absorption_ongoing`
- `game/systems/facts/absorptionOngoingFact.ts` still computes the obsolete absorption fact
- `ui/runtime/world/selection/selectionUtils.ts` still re-exports face/swarm/proxy-related helpers
- `ui/runtime/world/selection/selectionLensMap.ts` still matches any `assignment` entity as a job card, which preserves old absorption-first selection semantics
- `ui/runtime/world/selection/absorption/**` still contains the processing selector UI and naming; these files are live and must be kept or moved intentionally, not guessed away

### Dead-code / dead-entry remnants
- `game/handlers/absorptionBatch*`
- `game/handlers/proxy*`
- `game/systems/FaceSystem.ts`
- `game/systems/face/**`
- `ui/runtime/world/selection/face/**`
- `ui/runtime/world/selection/swarm/**`
- `utils/faceAssignment.ts`
- `lib/body-identity/swarmMembership.ts`
- `lib/body-identity/resolveSwarmAvatarKeys.ts`
- `engine/phaser/display/modules/SwarmAvatarModule.ts` and related helpers/tests
- `data/schemas/game/face.ts`
- `data/schemas/v2/faceDefaults.ts`
- saves and tests still containing `sys_swarm`, face blueprints, and proxy expectations

This delta removes or rewires all of the above.

---

## 5. Implementation order

This order is mandatory.

1. move live processing-output logic off the old `absorptionBatch*` helpers
2. remove active references to `sys_swarm`, face, swarm, and absorption naming from live runtime/editor/terminal code
3. remove obsolete fact naming and replace it with processing naming
4. delete dead proxy / face / swarm / absorption files
5. update fixtures and tests

No deletion may happen before all live imports have been redirected.

---

## 6. File-level design

## 6.1 Files to add

### `game/handlers/processingOutputs.ts`

**Responsibility**

Provide the live processing-output utilities required by `ResolveBodyProcessingHandler` without depending on obsolete `absorptionBatch*` files.

**Logic**

This file owns:
- `ProcessingOutput` type
- output-shape validation
- reading processing outputs from the node state
- output amount calculation from the body component
- lifetime-xp calculation used by processing outputs

It must contain only logic still used by the live processing path.

**Interface**

Exports pure helpers used by `ResolveBodyProcessingHandler`:
- output reader
- output amount resolver
- lifetime-xp resolver

No function in this file may mention absorption, proxy, or swarm.

---

### `game/handlers/processingSpectacle.ts`

**Responsibility**

Provide the live spectacle/emission helper for processing outputs.

**Logic**

Move the still-needed spectacle spawning logic out of `absorptionBatchSpectacle.ts` into this file.

This file is required only if the current spectacle logic remains live after the old helpers are deleted. If `ResolveBodyProcessingHandler` can inline the existing behavior without duplication, then this file must **not** be created.

**Interface**

If created, exports one live helper consumed only by `ResolveBodyProcessingHandler`.

No absorption naming is allowed.

---

### `game/systems/facts/processingOngoingFact.ts`

**Responsibility**

Compute the live fact that indicates whether any processing node currently has assigned bodies.

**Logic**

- inspect runtime entities
- detect processing nodes using the live node-kind rules already used elsewhere
- return delta against the stored fact value on `sys_world`

**Interface**

Exports:
- `resolveProcessingOngoingFactDelta(snapshot)`
- `PROCESSING_ONGOING_FACT_ABOUT`

No absorption naming is allowed.

---

## 6.2 Files to change

### `game/handlers/ResolveBodyProcessingHandler.ts`

**Responsibility**

Resolve one completed processing event for one body on one node.

**Required change**

- remove imports from:
  - `absorptionBatchFinalization`
  - `absorptionBatchOutputs`
  - `absorptionBatchSpectacle`
- switch to the new live processing helpers
- keep the current body-kill / survivor-reassign / progress-reset semantics unchanged

**Logic after change**

This handler must depend only on live body-owned processing utilities.

**Interface after change**

Consumes `RESOLVE_BODY_PROCESSING` exactly as it does today. No command or payload change is allowed in this delta.

---

### `game/systems/FactsSystem.ts`

**Responsibility**

Emit runtime fact deltas.

**Required change**

- remove `ABSORPTION_ONGOING_FACT_ABOUT`
- remove `resolveAbsorptionOngoingFactDelta`
- use the new processing fact helper instead
- write fact key `processing_ongoing`

**Logic after change**

The fact system must describe the live model, not the deleted one.

**Interface after change**

The world fact key emitted by this file is `processing_ongoing`.

---

### `ui/runtime/terminal/runtimeRegistry.ts`

**Responsibility**

Register live runtime terminal commands.

**Required change**

- stop importing `setTargetCommand` from `commands/absorptionCommands.ts`
- move the command to a neutral file name under the same terminal command namespace, or inline that import from a new neutral command file
- keep the command name `target.set` unchanged

**Logic after change**

The runtime terminal registry must not route through obsolete absorption naming.

**Interface after change**

The user-facing terminal command surface is unchanged. Only the implementation file and naming are cleaned.

---

### `ui/devtools/editors/blueprint/visuals/previewSystemEntities.ts`

**Responsibility**

Create preview-only system entities for devtools blueprint visuals.

**Required change**

- stop creating `sys_swarm`
- keep creating `sys_world`
- create `sys_pointer` if the preview surface needs it for current body/pointer visuals; otherwise do not invent new preview entities

**Logic after change**

Devtools preview must reflect the live system-entity model only.

**Interface after change**

This file creates no swarm preview entity.

---

### `ui/devtools/editors/file/SystemConfigEditor.tsx`

**Responsibility**

Expose editable system-config routes.

**Required change**

- remove “Swarm Entity” card
- remove “Face Blueprints” card
- keep the remaining cards intact

**Logic after change**

The editor must not expose routes for deleted system entities or deleted authored face definitions.

**Interface after change**

No UI route for swarm or face config remains.

---

### `engine/runtime/runtimeReset.ts`

**Responsibility**

Reset runtime ECS + physics state.

**Required change**

- update comments and descriptive text so they mention only live system entities
- no behavior change if runtime reset already seeds the correct entities

**Logic after change**

Documentation and intent must match the live model.

**Interface after change**

No interface change.

---

### `engine/runtime/runtimePhysicsSeed.ts`

**Responsibility**

Seed physics bodies for pre-existing system entities.

**Required change**

- update comments and descriptive text so they mention only live system entities
- no behavior change if seeding already works for `sys_world` and `sys_pointer`

**Logic after change**

Comments must stop teaching a deleted `sys_swarm` model.

**Interface after change**

No interface change.

---

### `game/handlers/spawnFromBlueprint.ts`

**Responsibility**

Spawn runtime entities from blueprints.

**Required change**

- remove the `entityId !== "sys_swarm"` special-case guard
- use only `body` presence to decide whether spawned body identity/habiti handling applies

**Logic after change**

There is no swarm entity that must be exempted from body identity rules.

**Interface after change**

No command or function signature change.

---

### `engine/runtime/handlers/spawnBodyHabiti.ts`

**Responsibility**

Resolve pending habiti for newly spawned body entities.

**Required change**

- remove the `entity.id === "sys_swarm"` guard
- use only the presence of `body` as the gate

**Logic after change**

This file no longer knows about swarm.

**Interface after change**

No interface change.

---

### `ui/runtime/world/selection/selectionUtils.ts`

**Responsibility**

Public re-export surface for selection helpers.

**Required change**

Remove re-exports for:
- `resolveFace`
- `resolveFaceWithBlueprint`
- `resolveProxyFlag`
- `resolveSwarmTotals`
- `resolveSwarmCount`
- `resolveSwarmMemberIds`

Keep only the live selection helper surface.

**Logic after change**

The public selection-utils barrel must not advertise deleted concepts.

**Interface after change**

No face/swarm/proxy helper is exported.

---

### `ui/runtime/world/selection/selectionLensMap.ts`

**Responsibility**

Map runtime entities to selection-card lenses.

**Required change**

- stop matching any entity with `assignment` as a job card
- use the live node-kind rules instead:
  - processing nodes
  - power nodes
  - transfer nodes
  - resource nodes
  - bodies
  - cave
  - display
- do not add a face lens
- do not add a swarm lens

**Logic after change**

Selection routing must not preserve old absorption-first semantics and must not resurrect deleted actor categories.

**Interface after change**

No face/swarm/proxy/attribute-pool lens exists.

---

### `ui/runtime/world/selection/ConditionalActivationActorCards.test.tsx`

**Responsibility**

Verify conditional-activation notice rendering for live actor cards.

**Required change**

- remove the `FaceCard` case entirely
- keep body and cave coverage

**Logic after change**

The test must cover only live actor cards.

**Interface after change**

No face-card expectation remains.

---

### `ui/runtime/world/selection/absorption/absorptionUtils.ts`

**Responsibility**

Selection UI helper logic for the current processing-selector path.

**Required change**

- remove the `sys_swarm` special-case exclusion
- do not introduce any face/swarm replacement logic
- preserve only body-entity filtering relevant to the live selector

**Logic after change**

The processing selector must reason only about real bodies.

**Interface after change**

No behavior path mentions `sys_swarm`.

---

### `engine/phaser/veins/graphBuilderUtils.ts`

**Responsibility**

Provide helper utilities for building the persistent vein graph.

**Required change**

- remove all swarm-specific helper branches
- remove `source.getEntity("sys_swarm")` lookup
- keep only live Cave-rooted power-vein helpers

**Logic after change**

Persistent graph helpers contain no face/swarm remnant logic.

**Interface after change**

No interface change beyond removing dead internal branches.

---

### `engine/phaser/veins/nervousVeinFlow.ts`

**Responsibility**

Provide the remaining nervous pointer-preview flow behavior.

**Required change**

- remove the `targetId === "sys_swarm"` special case
- keep only live pointer-preview nervous behavior

**Logic after change**

There is no swarm target case in nervous flow logic.

**Interface after change**

No interface change.

---

### `ui/runtime/world/selection/face/FaceCard.tsx`
### `ui/runtime/world/selection/swarm/SwarmCard.tsx`
### `ui/runtime/world/selection/FaceCard.tsx`
### `ui/runtime/world/selection/SwarmCard.tsx`

**Responsibility**

None after this delta.

**Required change**

Delete the live entrypoints or re-exports after all imports are removed.

**Interface after change**

These files do not exist.

---

## 6.3 Files to delete

Globs are intentional where the whole folder is obsolete.

### Delete proxy remnants

Delete:
- `game/handlers/proxy*.ts`
- `game/handlers/proxy*.test.ts`
- `game/handlers/enqueueProxyCascadeKills.ts`
- `game/handlers/dispatchProxyFactHooks.ts`
- `ui/runtime/notifications/resolveRuntimeVisualEffects.proxyDeath.test.ts`
- `engine/runtime/handlers/KillHandler.proxyCascade.test.ts`

**Reason**

These files are proxy-specific and have no live replacement path.

---

### Delete obsolete absorption-batch remnants after live logic is migrated

Delete:
- `game/handlers/absorptionBatch*.ts`
- `game/handlers/absorptionBatch*.test.ts`
- `game/handlers/depletedAssignmentDispatch.ts`
- `game/handlers/resolveAbsorptionHabitiOutcome.ts`
- `ui/runtime/terminal/commands/absorptionCommands.ts`

**Reason**

These files belong to the removed batch-absorption / proxy model. Any still-needed logic must be moved before deletion.

---

### Delete face and swarm runtime/UI remnants

Delete:
- `game/systems/FaceSystem.ts`
- `game/systems/face/**`
- `ui/runtime/world/selection/face/**`
- `ui/runtime/world/selection/swarm/**`
- `ui/runtime/world/selection/FaceCard.tsx`
- `ui/runtime/world/selection/SwarmCard.tsx`
- `ui/runtime/world/selection/SwarmRowItem.tsx`
- `ui/runtime/world/selection/faceCardSelectors.ts`
- `ui/runtime/world/selection/swarmCardSelectors.ts`
- `ui/runtime/world/selection/selectionUtils/swarm.ts`
- `utils/faceAssignment.ts`
- `utils/faceAssignment.test.ts`
- `lib/body-identity/swarmMembership.ts`
- `lib/body-identity/resolveSwarmAvatarKeys.ts`
- `lib/body-identity/resolveSwarmAvatarKeys.test.ts`
- `data/schemas/game/face.ts`
- `data/schemas/v2/faceDefaults.ts`
- `engine/phaser/display/modules/SwarmAvatarModule.ts`
- `engine/phaser/display/modules/SwarmAvatarModule*.test.ts`
- `engine/phaser/display/modules/renderSwarmAvatarMember.ts`
- `engine/phaser/display/modules/swarmAvatarSlots.ts`
- `engine/phaser/display/avatar/swarmAvatarLayout.ts`
- `engine/phaser/display/avatar/swarmAvatarLayout.test.ts`

**Reason**

These files implement the removed face/swarm presentation and selection model.

---

### Delete stale authored/save/test remnants of `sys_swarm` and face blueprints

Delete or rewrite:
- `data/raw/saves/1.json`
- `data/raw/saves/2.json`
- `data/raw/saves/autosave.json`
- any preview fixtures that instantiate `sys_swarm`
- any tests that explicitly expect `sys_swarm`, face blueprints, or face/swarm cards

**Reason**

Fixtures must not resurrect deleted concepts.

---

## 7. Tests required by contract

Tests are colocated. All new/changed logic in this delta must have direct coverage.

## 7.1 Unit tests to add or update

### `game/handlers/ResolveBodyProcessingHandler.test.ts`

Must verify:
- no import path from deleted `absorptionBatch*` remains necessary
- output resolution still matches current processing semantics
- survivor path and destroy path both still work after helper migration

### `game/systems/FactsSystem.test.ts`

Must verify:
- world fact key `processing_ongoing` is updated correctly
- no `absorption_ongoing` fact is emitted

### `game/systems/facts/processingOngoingFact.test.ts`

Must verify:
- processing fact delta uses live processing-node rules only
- assigned bodies on processing nodes produce `1`
- no processing assignment produces `0`

### `ui/runtime/world/selection/selectionLensMap.test.ts`

Must verify:
- no face lens exists
- no swarm lens exists
- job-card routing uses live node-kind rules, not `assignment` alone

### `ui/runtime/terminal/runtimeRegistry.test.ts`

Must verify:
- `target.set` remains registered
- registry contains no `absorptionCommands` import dependency path

### `ui/devtools/editors/blueprint/visuals/previewSystemEntities.test.ts`

Must verify:
- preview entities include `sys_world`
- preview entities do not include `sys_swarm`

### `engine/phaser/veins/graphBuilderUtils.test.ts`

Must verify:
- no swarm entity lookup is performed
- persistent graph helpers operate without `sys_swarm`

### `engine/phaser/veins/nervousVeinFlow.test.ts`

Must verify:
- no swarm special case remains
- live pointer-preview nervous flow still functions

### `game/handlers/spawnFromBlueprint.test.ts`

Must verify:
- body identity handling no longer branches on `sys_swarm`

### `engine/runtime/handlers/spawnBodyHabiti.test.ts`

Must verify:
- pending habiti resolution no longer branches on `sys_swarm`

## 7.2 Tests to delete

Delete all tests that exercise deleted proxy, face, swarm, or absorption-batch files.

This includes any test whose only purpose is to verify:
- proxy cascade behavior
- face/swarm card rendering
- swarm avatar layout
- face assignment helpers
- `sys_swarm` runtime bootstrap
- old absorption-batch utilities

## 7.3 Fixture rewrites

Update all bundled save fixtures and authored preview fixtures so that they contain:
- no `sys_swarm`
- no `face_*` entities
- no swarm-derived vein edges
- no `previousProxyInbound` fields retained only for dead concepts

---

## 8. Acceptance criteria

This cleanup delta is complete only when all of the following are true:

1. No live import path references deleted proxy, face, or swarm files.
2. No live runtime/editor/terminal file mentions `sys_swarm`.
3. `ResolveBodyProcessingHandler` depends only on live processing helpers.
4. No live fact key or file name refers to `absorption_ongoing`.
5. No selection barrel or lens exposes face/swarm/proxy helpers or cards.
6. Devtools preview and system-config UI contain no swarm/face entrypoints.
7. Bundled saves and fixtures contain no swarm/face/proxy remnants.
8. All newly changed logic is covered by colocated tests.
9. Deleted tests are removed in the same branch as the deleted code.

