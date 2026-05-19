# LLD — Excise Obsolete Body Proxy Logic and Restore Non-Purge Body Death Effects

## 1. Purpose

This document defines the low-level design for two changes in the current codebase:

1. Remove the obsolete **body proxy** mechanic and all lingering production-code references to it.
2. Restore **screen shake and death animation** for body death when the death is **not caused by the Purge**.

This is a corrective delta against the current implementation. It is not a broad refactor.

---

## 2. Scope

### In scope

- Remove the obsolete runtime/body proxy mechanic from production code.
- Remove or rename all remaining production references that still use the word `proxy` for that mechanic.
- Rename the unrelated `JsonLogicAdapter.proxy.ts` file and exported symbols so the word `proxy` no longer appears outside the removed mechanic.
- Restore body death visuals for all non-Purge body deaths, including direct processing deaths.
- Ensure Purge kills remain excluded from those body-death visuals.
- Update tests so they validate the corrected behavior and no longer encode the obsolete proxy model.

### Out of scope

- Any new body-transport mechanic.
- Any redesign of Cave salience beyond removal of proxy-specific signals.
- Any unrelated animation or notification work.

---

## 3. Current Evidence in the Codebase

### 3.1 The obsolete body proxy mechanic still exists in production code

The current production code still contains proxy-specific schemas, helpers, branching, and salience logic.

#### Schema and exports
- `src/data/schemas/assignment.ts`
- `src/data/schemas/components.ts`

These files still define and export `ProxyComponentSchema` / `ProxyComponent`.

#### Game runtime and handler detritus
- `src/game/handlers/absorptionBatchProcessing.ts`
- `src/game/handlers/absorptionBatchProcessOutputs.ts`
- `src/game/handlers/absorptionBatchEntities.ts`
- `src/game/handlers/proxyAssignmentCleanup.ts`
- `src/game/handlers/proxyDisplay.ts`
- `src/game/handlers/proxyRadius.ts`
- `src/game/handlers/dispatchProxyFactHooks.ts`
- `src/game/systems/absorption/absorptionArrivalUtils.ts`
- `src/game/systems/absorption/absorptionDigestionUtils.ts`
- `src/game/systems/facts/activeBodiesFact.ts`

These files are all part of the obsolete body proxy path or are named after it.

#### Cave mind still reacts to proxy-specific stimuli
- `src/game/systems/cave/collectCaveCandidate.ts`
- `src/game/systems/cave/updateCaveSalienceScore.ts`
- `src/game/systems/cave/updateCaveSalience.ts`
- `src/game/systems/cave/resolveCaveAttention.ts`
- `src/game/systems/cave/CaveMindConfig.ts`
- `src/game/systems/cave/caveMindTypes.ts`
- `src/data/schemas/game/caveMind.ts`

These files still carry `proxyInbound`, `previousProxyInbound`, `multipliers.proxy`, and `dominantStimulus = "proxy"` despite the body proxy mechanic being obsolete.

#### UI and engine still special-case proxy entities
- `src/ui/runtime/effects/resolveRuntimeVisualEffects.ts`
- `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.helpers.ts`
- `src/ui/runtime/world/selection/selectionUtils/entity.ts`
- `src/game/tutorials/resolveTutorialBindings.ts`
- `src/engine/phaser/scenes/entityDragController.ts`
- `src/engine/phaser/display/avatar/AvatarSeedResolver.ts`

These files still inspect `entity.proxy`, `tags.includes("proxy")`, or proxy-origin ids.

### 3.2 There is also one unrelated file whose name/export still says proxy

- `src/engine/logic/JsonLogicAdapter.proxy.ts`
- `src/engine/logic/JsonLogicAdapter.ts`

This file uses JavaScript `Proxy`, not the obsolete body proxy mechanic, but the instruction is explicit: the word `proxy` outside the obsolete body proxy context is wrong and must be fixed. That means this file and its exported symbol names must be renamed.

### 3.3 Non-Purge body death visuals are inconsistent because direct processing death bypasses the kill effect path

#### Current visual-effects path
- `src/ui/runtime/effects/resolveRuntimeVisualEffects.ts`

Current behavior:
- body-death shake is emitted for **any** body kill command, including Purge kills
- smoke-puff kill animation is emitted only when:
  - the entity has `anim:kill`, or
  - the entity is treated as a proxy and `metadata.proxyCascadeKill === true`

That is already wrong for the target contract because Purge kills are not excluded from shake.

#### Current direct processing death path
- `src/game/handlers/resolveBodyProcessingCommand.ts`

Current behavior:
- when processing destroys the body, the handler directly calls:
  - `context.world.remove(body)`
  - `context.impulseEngine.removeBody(body.id)`
- it does **not** emit a `KILL` command
- it does **not** patch any death presentation metadata onto the processing command

Result:
- the standard kill visual-effects path never sees this death as a kill event
- no smoke-puff effect can be emitted for these non-Purge body deaths
- no reliable body-death shake can be emitted from the visual-effects path either

This directly explains the missing non-Purge death visuals for processing deaths.

---

## 4. Target Contract

### 4.1 Body proxy excision

After the change:
- no production runtime path may depend on `entity.proxy`
- no production schema may define a body-proxy component
- no production file or exported production symbol may contain the word `proxy` unless it refers to the JavaScript language primitive, and that primitive usage must still be renamed so the word is gone from the code surface
- Cave-mind salience and attention must not contain proxy-specific concepts
- UI helpers must resolve body/selection/avatar behavior directly from bodies and assignments only
- tutorial resolution must not contain a special `tag === "proxy"` branch

### 4.2 Non-Purge body death visuals

After the change:
- every non-Purge body death must emit both:
  - kill smoke puff
  - body-death camera shake
- Purge-caused body deaths must emit neither of those two effects
- direct processing deaths must carry enough metadata for the runtime visual-effects path to render those effects
- non-body `anim:kill` entities may retain smoke-puff behavior if that behavior is otherwise still valid

---

## 5. Design Decisions

### 5.1 Delete dead body-proxy production paths instead of abstracting them

The prompt is explicit: this mechanic is obsolete and its detritus must be excised.

Therefore:
- dead production helper files dedicated to proxy handling must be removed, not renamed into generic helpers
- remaining call sites must be rewritten to operate directly on bodies or on assignment ids already present in runtime state

### 5.2 Remove proxy-specific salience instead of renaming it

The Cave mind is currently reacting to a stimulus that should no longer exist. Renaming `proxyInbound` to another name would preserve obsolete semantics.

Therefore:
- proxy-specific salience inputs, config, and memory fields must be removed
- Cave attention falls back to the remaining existing stimuli only

### 5.3 Non-Purge body death effects must be driven by explicit cause and explicit presentation

The runtime already has the metadata primitives needed:
- `cause`
- `deadBodyPresentation`
- `killedEntityPresentations`

The cleanest correction is:
- keep Purge discrimination based on `metadata.cause === "purge"`
- make direct processing deaths attach presentation metadata to the existing processing command
- make the visual-effects resolver consume that metadata

This avoids introducing a new command type and avoids delaying the death by one extra tick.

---

## 6. File-by-File Change Plan

## A. Remove obsolete body proxy schema and exports

### 6.1 `src/data/schemas/assignment.ts`

#### Responsibility
Defines assignment-related runtime component schemas.

#### Required change
Remove:
- `ProxyComponentSchema`
- `ProxyComponent`

#### Logic
This file must define assignment state only. The obsolete body proxy component no longer exists in the runtime model.

#### Interface
This is a breaking schema cleanup by design. All imports of `ProxyComponentSchema` / `ProxyComponent` must be removed in the same change.

---

### 6.2 `src/data/schemas/components.ts`

#### Responsibility
Central export surface for component schemas and types.

#### Required change
Remove all re-exports and type exports of the proxy component.

#### Interface
No replacement export is needed.

---

## B. Delete obsolete proxy-mechanic production helpers

### 6.3 Delete `src/game/handlers/absorptionBatchProcessing.ts`
### 6.4 Delete `src/game/handlers/absorptionBatchProcessOutputs.ts`
### 6.5 Delete `src/game/handlers/absorptionBatchEntities.ts`
### 6.6 Delete `src/game/handlers/proxyAssignmentCleanup.ts`
### 6.7 Delete `src/game/handlers/proxyDisplay.ts`
### 6.8 Delete `src/game/handlers/proxyRadius.ts`
### 6.9 Delete `src/game/handlers/dispatchProxyFactHooks.ts`
### 6.10 Delete `src/game/systems/absorption/absorptionArrivalUtils.ts`
### 6.11 Delete `src/game/systems/absorption/absorptionDigestionUtils.ts`

#### Responsibility
These files are dedicated to the obsolete body proxy mechanic.

#### Required change
Delete them and remove any remaining production imports.

#### Logic
No replacement abstraction should be introduced. If any tiny piece of live logic is still needed, it must be inlined into the remaining active production path under body/assignment terminology, not proxy terminology.

#### Interface
Any test that exists only for these deleted helpers must also be deleted or replaced by behavior tests on the surviving active code.

---

## C. Remove proxy-specific logic from live runtime paths

### 6.12 `src/game/systems/facts/activeBodiesFact.ts`

#### Responsibility
Counts active bodies for fact updates.

#### Current problem
It excludes bodies via `entity.proxy` and via assigned ids interpreted through proxy original ids.

#### Required change
Remove all proxy-derived exclusion logic.

#### Logic
The active-body exclusion rules must be expressed only in terms of:
- actual body entities
- assignment membership
- explicit locks/tags already present in the body itself

#### Interface
The exported fact delta API remains unchanged.

---

### 6.13 `src/game/systems/cave/collectCaveCandidate.ts`

#### Responsibility
Collects Cave salience candidates.

#### Current problem
It emits `proxyInbound` based on `entity.proxy?.state` and `state.proxy_state`.

#### Required change
Remove `proxyInbound` from the candidate shape.

#### Logic
Candidate construction must rely only on remaining live signals:
- assigned count
- cycle activity
- selection
- dragging
- exploration tag
- motion

#### Interface
The candidate type and downstream users must be updated accordingly.

---

### 6.14 `src/game/systems/cave/caveMindTypes.ts`

#### Responsibility
Defines Cave salience and attention types.

#### Required change
Remove:
- `proxyInbound` from `CaveStimulus`
- `proxyInbound` from `RankedSalience`

#### Interface
All production callers must compile without any proxy-specific field.

---

### 6.15 `src/data/schemas/game/caveMind.ts`

#### Responsibility
Defines persisted Cave mind memory.

#### Required change
Remove:
- `previousProxyInbound`

#### Logic
Proxy-specific memory is obsolete. No replacement field is required.

#### Interface
The persisted Cave mind shape changes accordingly. No migration logic is introduced in this LLD; runtime parsing should rely on existing tolerant schema defaults where applicable.

---

### 6.16 `src/game/systems/cave/CaveMindConfig.ts`

#### Responsibility
Provides Cave salience configuration constants.

#### Required change
Remove:
- `salience.multipliers.proxy`
- `salience.inboundImpulse`
- `salience.inboundBonus`

Only keep configuration that still maps to live stimuli.

---

### 6.17 `src/game/systems/cave/updateCaveSalienceScore.ts`

#### Responsibility
Scores Cave candidates and resolves dominant stimulus.

#### Required change
Remove all proxy-specific scoring.

#### Logic
Delete:
- the `proxyInbound` parameter from `resolveDominantStimulus`
- the `"proxy"` dominant stimulus branch
- proxy multiplier contribution
- proxy impulse contribution
- proxy bonus contribution

The function must score only remaining live stimuli.

#### Interface
Public exports stay in place, but their input shapes change to the new proxy-free types.

---

### 6.18 `src/game/systems/cave/updateCaveSalience.ts`

#### Responsibility
Builds updated salience memory.

#### Required change
Remove storage and propagation of `previousProxyInbound` and `stimulus.proxyInbound`.

---

### 6.19 `src/game/systems/cave/resolveCaveAttention.ts`

#### Responsibility
Chooses the Cave attention target and look mode.

#### Required change
Remove the special-case lock behavior for `chosen.proxyInbound`.

#### Logic
The attention decision must be derived from the remaining stimulus fields only.

---

### 6.20 `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.helpers.ts`

#### Responsibility
Filters spawn-discovery notifications.

#### Current problem
It blocks discovery on any entity with `entity.proxy`.

#### Required change
Remove the proxy-specific discovery block branch.

#### Logic
Discovery blocking should remain only for actually relevant runtime categories such as bodies and transfers.

---

### 6.21 `src/ui/runtime/world/selection/selectionUtils/entity.ts`

#### Responsibility
Resolves selection targets, labels, and body display identity.

#### Current problem
`resolveBodySelectionTargetId(...)` unwraps through `entity.proxy.originalId`.

#### Required change
Remove proxy unwrapping.

#### Logic
Body selection targets must resolve directly from real body entities only.

---

### 6.22 `src/engine/phaser/display/avatar/AvatarSeedResolver.ts`

#### Responsibility
Resolves avatar subject seeds for rendering.

#### Current problem
It first falls back through `entity.proxy.originalId`.

#### Required change
Remove proxy fallback.

#### Logic
Avatar seed resolution must use:
- assigned body id when applicable
- own passport/avatar identity
- own entity id as final fallback

#### Interface
No public API rename required here.

---

### 6.23 `src/engine/phaser/scenes/entityDragController.ts`

#### Responsibility
Starts and updates drag interactions.

#### Current problem
It blocks dragging for entities with `entity.proxy` or `tags.includes("proxy")`.

#### Required change
Remove those proxy-specific exclusions.

#### Logic
Drag gating should be based only on live rules that still exist.

---

### 6.24 `src/game/tutorials/resolveTutorialBindings.ts`

#### Responsibility
Resolves tutorial self-target bindings.

#### Current problem
It contains a dedicated `tag === "proxy"` resolution path.

#### Required change
Remove that special case.

#### Logic
Tutorial self-binding must resolve from the surviving generic binding logic only.

#### Interface
No new binding kind is introduced.

---

## D. Rename unrelated `proxy` terminology in JsonLogicAdapter

### 6.25 Rename `src/engine/logic/JsonLogicAdapter.proxy.ts`

#### Responsibility
Provides entity/data facade objects for logic evaluation using the JavaScript `Proxy` primitive.

#### Required change
Rename the file so the production codebase no longer contains the word `proxy` outside the obsolete body-proxy mechanic.

#### Required target name
Use a neutral name such as:
- `JsonLogicAdapter.entityFacade.ts`

#### Logic
Also rename the exports:
- `createEntityProxy` → `createEntityFacade`
- `createLogicDataProxy` → `createLogicDataFacade`

### 6.26 `src/engine/logic/JsonLogicAdapter.ts`

#### Required change
Update imports and usage to the renamed file and renamed exports.

#### Logic
No behavior change. This is a terminology-only cleanup required by the prompt.

---

## E. Restore non-Purge body death effects

### 6.27 `src/game/handlers/resolveBodyProcessingCommand.ts`

#### Responsibility
Resolves per-body processing completion for the active processing path.

#### Current problem
When a processing node destroys the body, the handler removes the body directly from the world and impulse engine.
That bypasses the kill visual-effects path completely.

#### Required change
Before removing a body destroyed by processing, attach killed-body presentation metadata to the existing `RESOLVE_BODY_PROCESSING` command.

#### Logic
For the processed body being destroyed:
- capture physics presentation before removal
- append a `killedEntityPresentations` entry for that body onto the processing command metadata
- then continue the existing direct removal path if keeping that path is otherwise desired

This makes the direct processing death visible to the runtime visual-effects resolver without introducing a new command type.

#### Interface
No command type change.
No handler API change.

---

### 6.28 `src/ui/runtime/effects/resolveRuntimeVisualEffects.ts`

#### Responsibility
Converts applied runtime commands into runtime visual effect events.

#### Current problems
1. It still contains proxy-specific kill logic.
2. It emits body-death camera shake for Purge kills.
3. It cannot emit a death effect for direct processing deaths because those are not represented as `KILL` commands.

#### Required change
Rewrite the body-death effect resolution around two explicit rules:

##### Rule A — Body death effects are cause-aware
- If a body death has `metadata.cause === "purge"`, emit no body-death smoke puff and no body-death camera shake.
- If a body death is not caused by Purge, emit both effects.

##### Rule B — Body death effects consume both kill commands and compound-command metadata
- `KILL` commands for body entities must emit non-Purge body death visuals.
- `RESOLVE_BODY_PROCESSING` commands carrying `killedEntityPresentations` for body ids must emit the same non-Purge body death visuals.

##### Rule C — Non-body kill smoke behavior remains tag-based
- Non-body `anim:kill` entities may continue to emit smoke puff if that behavior already exists.
- This is separate from the body-death rule.

#### Logic
Remove:
- `isProxy`
- `proxyCascadeKill`
- all proxy-based branches

Introduce:
- a body-death event collector that is driven by body identity and non-Purge cause, not by tags or proxy metadata
- a compound-command collector for killed body presentations on `RESOLVE_BODY_PROCESSING`

#### Interface
No change to the outward `resolveRuntimeVisualEffects(...)` signature.
The returned effect event kinds stay the same:
- `kill_smoke_puff`
- `body_death_camera_shake`

---

## 7. Tests

All tests must follow the canonical testing rules: Given / When / Then structure, behavior-first assertions, and real data structures where possible. fileciteturn0file2

### 7.1 Delete obsolete proxy-mechanic tests

Delete or replace tests that exist only to protect the removed proxy mechanic, including but not limited to:
- `src/ui/runtime/effects/resolveRuntimeVisualEffects.proxyDeath.test.ts`
- `src/game/handlers/proxyDisplay.test.ts`
- proxy-only test cases in files whose production logic is being deleted

### 7.2 Update tests affected by schema and terminology cleanup

Update or remove proxy-specific test fixtures in:
- `src/game/systems/CaveMindSystem.attention.test.ts`
- `src/ui/runtime/notifications/resolveRuntimeNotificationEvents.discovery.test.ts`
- `src/ui/runtime/tutorials/resolveCameraFocusPosition.test.ts`
- `src/ui/runtime/world/selection/body/BodyCard.test.tsx`
- `src/engine/phaser/display/avatar/AvatarSeedResolver.test.ts`
- `src/engine/phaser/display-export/resolveBodyAvatarExportInputs.test.ts`
- any test importing the renamed JsonLogicAdapter facade file or symbols

The tests must be rewritten to validate the new body-direct behavior rather than proxy fallback behavior.

### 7.3 Add / update body-death visual tests

#### `src/ui/runtime/effects/resolveRuntimeVisualEffects.deathShake.test.ts`

Add explicit Purge discrimination:
- Given a Purge-caused body kill
- When visual effects are resolved
- Then no `body_death_camera_shake` is emitted

Add explicit non-Purge body case:
- Given a non-Purge body kill
- When visual effects are resolved
- Then exactly one shake is emitted for the batch

#### `src/ui/runtime/effects/resolveRuntimeVisualEffects.test.ts`

Add non-Purge body smoke coverage:
- Given a body entity kill with presentation
- When visual effects are resolved
- Then `kill_smoke_puff` is emitted even if the body is not relying on `anim:kill`

#### New test: direct processing death metadata path

Create a focused test alongside `resolveRuntimeVisualEffects` or `resolveBodyProcessingCommand` verifying:
- Given a `RESOLVE_BODY_PROCESSING` command whose handler attached `killedEntityPresentations` for a body
- When visual effects are resolved
- Then non-Purge body smoke and one body-death shake are emitted

#### `src/game/handlers/resolveBodyProcessingCommand.test.ts` (new if absent)

Add a handler-focused test verifying:
- Given a processing node that destroys bodies
- When `handleResolvedBodyProcessing(...)` runs
- Then the command metadata gains a killed-body presentation entry before the body is removed

---

## 8. Acceptance Criteria

The change is complete only when all of the following are true:

1. No production file or production export still contains the obsolete body proxy mechanic.
2. No production file still contains the word `proxy` except where unavoidable inside JavaScript language usage, and that remaining usage is hidden behind renamed file and export surfaces.
3. `ProxyComponentSchema` and `ProxyComponent` are removed from the schema surface.
4. Cave-mind salience and attention contain no proxy-specific stimulus, memory, config, or dominant-stimulus paths.
5. Selection, avatar seed, drag handling, tutorials, and discovery filtering no longer inspect `entity.proxy` or `tags.includes("proxy")`.
6. Non-Purge body deaths emit both smoke puff and camera shake.
7. Purge-caused body deaths emit neither smoke puff nor body-death shake.
8. Direct processing deaths now produce the same non-Purge body-death visuals through explicit presentation metadata.
9. All updated tests are green and no test still asserts proxy-specific runtime behavior.

---

## 9. Non-Negotiable Constraints

- No direct ECS mutation outside the existing apply-phase handler model. fileciteturn0file0turn0file3
- No scope expansion into unrelated tech debt. fileciteturn0file1turn0file4turn0file7
- Tests must remain behavior-first and human-readable. fileciteturn0file2turn0file5turn0file8
