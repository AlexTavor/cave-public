# LLD: Carrier-Based Acquisition for Habiti and Understandings

## 1. Purpose

Replace the current **pending habiti pickup** implementation with a single **carrier** runtime mechanism that is used by both:

- habiti discovery from body processing
- understanding rewards from authored behavior / draft completion

This change must remove the old pending-habiti pickup path completely, including obsolete state, commands, systems, handlers, blueprint data, and tests.

This design is constrained by the project rules in the uploaded Context Pack, Prompt Contract, and Testing Standards:
- all mutations must remain in the command/apply pipeline
- systems remain read-only
- the design must use existing mechanisms where they already fit
- tests must validate behavior, not implementation details

## 2. Why

### 2.1 Current asymmetry in the codebase

The codebase currently has two different acquisition paths:

1. **Understanding**
   - already has a first-class command: `GAIN_UNDERSTANDING`
   - is applied directly by `GainUnderstandingHandler`

2. **Habiti**
   - does **not** have a first-class gain command
   - body processing writes discovered habiti into `sys_world.cave.pendingHabiti`
   - a synthetic pickup entity is spawned from the `pending_habiti_pickup` blueprint
   - `PendingHabitiPickupSystem` moves that pickup to cave and orbits it
   - `ClaimPendingHabitiPickupSystem` converts cave selection into `CLAIM_PENDING_HABITI_PICKUP`
   - `ClaimPendingHabitiPickupHandler` mutates `ownedHabiti`, removes `pendingHabiti`, syncs resource gain bonuses, announces, and deletes the pickup

That means habiti acquisition is currently split across cave state, a dedicated blueprint, two systems, and a dedicated handler.

### 2.2 Why that is a problem

The current habiti path creates unnecessary special-case machinery:

- `pendingHabiti` duplicates information that can be represented by live runtime entities
- the pickup blueprint is only a transport shell
- the claim command is a one-off command whose only real job is “grant habitus and remove the shell”
- understandings cannot use the same physical acquisition mechanism even though the desired user experience is identical

### 2.3 Why the carrier design is the correct normalization

A carrier is the shared operational mechanism:

- it is a physical entity
- it navigates to cave
- once close enough, it orbits cave
- on interaction, it executes a seeded action list
- the action list is authored/seeded by the caller
- the action list normally ends with `KILL self`

This lets both habiti and understandings use the same physical pickup flow without introducing a new blueprint or a new kind enum.

## 3. Locked decisions

These decisions are fixed by the discussion and by the existing code constraints.

1. **No carrier blueprint**
   - `SPAWN_CARRIER` does not use `blueprintId`
   - carrier entities are constructed directly at runtime

2. **No carrier `kind` field**
   - semantic identity is carried by the caller-supplied tag paths
   - the carrier subsystem treats tags as opaque and does not derive meaning from them

3. **Only carrier settings are authored in `.cave`**
   - `radius`
   - `displayId`

4. **Carrier payload is seeded by the caller**
   - habiti processing seeds `[GAIN_HABITI, KILL self]`
   - understanding rewards seed `[GAIN_UNDERSTANDING, KILL self]`

5. **No body-assignment generalization in this change**
   - the current body assignment orbit logic is a different subsystem with different state and semantics
   - reworking it now would be a speculative refactor
   - this change only extracts and reuses the existing pending-pickup movement/orbit behavior

6. **No automatic tag injection**
   - `SPAWN_CARRIER` requires caller-supplied tags
   - the handler does not infer or append semantic tags

7. **No automatic `KILL self` injection**
   - the seeded payload must contain the explicit terminal kill action
   - this preserves the requested contract and keeps carrier interaction behavior explicit

8. **No new sentence DSL for `SPAWN_CARRIER`**
   - `SPAWN_CARRIER` contains nested actions
   - the existing text action compiler is intentionally not extended with a new mini-language for nested action arrays in this change
   - the engine and schemas support the action
   - the devtools action formatter must display it, but sentence-based authoring remains unsupported for this one action
   - `GAIN_HABITI` **is** supported by the existing sentence-based action compiler because it is flat and matches the current `GAIN_UNDERSTANDING` pattern

## 4. Current code-grounded baseline

The following current files establish the baseline being replaced or reused.

### 4.1 Habiti pickup pipeline being removed

- `src/game/handlers/processingPendingHabiti.ts`
  - computes newly discovered habiti during processing
  - writes them into `sys_world.cave.pendingHabiti`
  - spawns pickup entities

- `src/game/habiti/pendingHabiti.ts`
  - owns `pendingHabiti` helpers
  - defines the pickup id encoding
  - defines `readKnownHabiti = ownedHabiti + pendingHabiti`

- `src/game/habiti/pendingHabitiPickupCommands.ts`
  - spawns and restores `pending_habiti_pickup` entities

- `src/game/systems/PendingHabitiPickupSystem.ts`
  - reconciles cave pending state with live pickup entities
  - restores missing pickups
  - kills redundant pickups
  - delegates movement/orbit behavior

- `src/game/systems/pendingHabitiPickupLifecycle.ts`
  - handles seek-cave, arrival, phantom layer, and orbiting

- `src/game/systems/pendingHabitiPickupMotion.ts`
  - owns the current orbit constants and reach threshold

- `src/game/systems/ClaimPendingHabitiPickupSystem.ts`
  - turns selection into `CLAIM_PENDING_HABITI_PICKUP`

- `src/game/handlers/ClaimPendingHabitiPickupHandler.ts`
  - grants the habitus
  - removes it from `pendingHabiti`
  - syncs cave bonuses
  - announces
  - deletes the pickup entity

- `src/data/raw/example/modules/pending_habiti_pickup.bp`
  - exists only to define the pickup shell visuals and radius

### 4.2 Understanding path being retained and normalized

- `src/game/handlers/GainUnderstandingHandler.ts`
  - already validates entity, cave component, and understanding id
  - already mutates `ownedUnderstanding`
  - already mirrors facts and syncs cave resource-gain bonuses for `sys_world`

### 4.3 Reusable mechanisms that must be kept

- `ActionExecutor` and the behavior action pipeline
- `UPDATE_STATE`, `SET_TARGET`, `SET_PHYSICS_LAYER`, `POSITION_ENTITY`, `KILL`
- `UpdateCaveWithResourceGainBonusHandler`
- `enqueueHabitiAnnouncement`
- `enqueueMirroredFactAdjust`
- the current orbit constants from `pendingHabitiPickupMotion.ts`
- `gameRebirthCommand` carryover flow
- the existing display asset / view-editor machinery in devtools

## 5. Target design

## 5.1 Carrier settings in `.cave`

A new `.cave` settings section is added:

- top-level semantic fragment key: `carrier`
- runtime/settings path: `config.settings.carrier`

### Carrier settings contract

- `displayId: string`
  - default: `"egg"`
  - this is a display key, not a full display component
  - it uses the same display-key authoring model as passport visuals

- `radius: number`
  - default: `12`
  - minimum: `1`

These defaults are taken directly from the deleted `pending_habiti_pickup.bp` blueprint, so behavior and visuals remain unchanged unless the user edits them.

## 5.2 Runtime carrier entity contract

A carrier is a normal runtime entity with these components/fields:

- `id`
- `tags`
- `display`
  - `label = displayId`
  - `display_key = displayId`
- `physics`
  - `mass = 1`
  - `drag = 0.1`
  - `isStatic = false`
  - `radius = config.settings.carrier.radius`
  - `x`, `y` = resolved spawn position
- `carrier`
  - `commands: BehaviorAction[]`
- `state`
  - hidden state key `carrier_arrived`
  - `0` while navigating
  - `1` after arrival

No blueprint id is attached.

No `kind` field is attached.

No extra semantic tags are injected by the system.

## 5.3 New behavior action contracts

### `GAIN_HABITI`

Flat authored action.

Fields:
- `type = "GAIN_HABITI"`
- `habitusId: string`
- `entityId?: string`

Semantics:
- defaults `entityId` to `sys_world`
- mirrors `GAIN_UNDERSTANDING`
- intended for use inside carrier payloads, but valid anywhere authored actions are valid

### `SPAWN_CARRIER`

Nested authored action.

Fields:
- `type = "SPAWN_CARRIER"`
- `tags: string[]`
- `commands: BehaviorAction[]`

Constraints:
- `tags` must be non-empty
- `commands` must be non-empty

Semantics:
- creates a carrier entity at the source entity’s current physics position
- if the source entity has no physics body, it falls back to the handler’s spawn-position rules
- carries the nested action list verbatim
- does not expose radius or display overrides
- always uses `.cave` carrier settings for visuals and radius

## 5.4 New runtime command contracts

### `GAIN_HABITI`

Fields:
- `entityId: string`
- `habitusId: string`

Handler behavior:
- validate entity exists
- validate entity has a cave component
- validate `habitusId` exists in `context.cartridge.config?.habiti`
- no-op if already owned
- apply `ownedHabiti`
- for `sys_world` only:
  - mirror `habitus_owned`
  - sync cave resource gain bonuses
  - enqueue habitus announcement

### `SPAWN_CARRIER`

Fields:
- `id?: string`
- `x?: number`
- `y?: number`
- `arrived?: boolean`
- `tags: string[]`
- `commands: BehaviorAction[]`

Handler behavior:
- validate `tags` is non-empty
- validate `commands` is non-empty
- resolve spawn position:
  1. use `x` and `y` if both are present
  2. otherwise use the physics position of `metadata.sourceEntityId` if available
  3. otherwise use `sys_world` physics position
  4. otherwise log loudly and abort
- read carrier settings from `context.cartridge.config?.settings?.carrier`, parsed with defaults
- create/replace the runtime entity
- create/register the physics body
- initialize hidden `carrier_arrived` state from `arrived ?? false`

The optional `id` and `arrived` fields are runtime-only. They exist so rebirth and recovery can recreate live carriers exactly. They are not authored in behavior actions.

## 5.5 New command provenance lane

A new `RuntimeCommandSourceLane` value is added:

- `carrier_interaction`

This is required because carrier interaction executes nested behavior actions through `ActionExecutor`, and those emitted commands need correct provenance.

## 6. Detailed behavioral flows

## 6.1 Understanding reward flow after the change

1. A behavior or draft completion decides to reward an understanding.
2. It emits `SPAWN_CARRIER` instead of `GAIN_UNDERSTANDING`.
3. The nested payload contains:
   - `GAIN_UNDERSTANDING <id>`
   - `KILL self`
4. The spawned carrier navigates to cave.
5. When selected/interacted with, the carrier executes its nested commands.
6. The understanding is granted.
7. The carrier kills itself.

## 6.2 Habiti reward flow after the change

1. Body processing detects newly discovered habiti.
2. It does **not** write `pendingHabiti`.
3. For each new habitus, it emits `SPAWN_CARRIER`.
4. The nested payload contains:
   - `GAIN_HABITI <id>`
   - `KILL self`
5. The spawned carrier navigates to cave.
6. When selected/interacted with, the carrier executes its nested commands.
7. The habitus is granted.
8. The carrier kills itself.

## 6.3 Carrier navigation and orbit flow

Carrier navigation reuses the existing pending-pickup rules without changing the numeric behavior:

- arrival threshold:
  - `distance_to_cave <= cave.radius + 40`
- orbit ring size:
  - `8`
- orbit angular speed:
  - `0.0006`
- orbit radius:
  - `cave.radius + 34 + ringIndex * 18`

System behavior:

1. Collect all live carrier entities.
2. Sort them by entity id ascending.
3. For each carrier:
   - if no physics body exists:
     - re-enqueue `SPAWN_CARRIER` with the same id, tags, commands, current position, and current arrived state
   - else if `carrier_arrived == 0`:
     - ensure physics layer is `default`
     - ensure target is `sys_world`
     - if close enough:
       - clear target
       - set hidden `carrier_arrived = 1`
   - else:
     - ensure target is null
     - ensure physics layer is `phantom`
     - place the entity on its deterministic orbit slot with `POSITION_ENTITY`

This preserves current pickup motion while deleting the old cave-state reconciliation.

## 6.4 Carrier interaction flow

1. Read `sys_world.state.cave_selected_entity_id`.
2. Resolve the selected entity from the snapshot.
3. If the selected entity is not a carrier, do nothing.
4. If it is a carrier:
   - execute its stored `carrier.commands` using `ActionExecutor`
   - `self` is the carrier entity
   - `sourceLane` is `carrier_interaction`
   - use the same snapshot/global/assignment-map setup already used for draft completion execution

The interaction system does **not** interpret carrier tags.

The interaction system does **not** special-case habiti vs understanding.

It only executes the seeded actions.

## 6.5 Known-habiti derivation after the change

Because `pendingHabiti` is removed, “known habiti” becomes:

- `ownedHabiti`
- plus any live carrier whose top-level `carrier.commands` contains a `GAIN_HABITI` action

This is only used for duplicate prevention and previews.

The helper must:

- scan live runtime entities
- select entities with a `carrier` component
- inspect only the top-level `carrier.commands` array
- collect `habitusId` from direct `GAIN_HABITI` actions
- union those ids with `ownedHabiti`
- normalize and sort

No tag-based inference is allowed.

No recursive nested scan is required in this change.

## 6.6 Rebirth carryover after the change

`gameRebirthCommand` currently preserves `pendingHabiti` by copying cave state.

After this change that is incorrect because pending state no longer lives in cave.

Rebirth must instead:

1. extract cave state without `pendingHabiti`
2. extract all live carriers, including:
   - id
   - tags
   - commands
   - position
   - arrived state
3. run the new game script
4. restore cave state
5. restore live carriers by enqueueing `SPAWN_CARRIER` for each extracted carrier
6. flush commands

This preserves pre-rebirth pending pickups without keeping redundant cave state.

## 7. File-by-file implementation plan

## 7.1 New files

### `src/data/schemas/game/carrier.ts`
**Responsibility**
- define the authored carrier settings schema used in `.cave`

**Logic**
- export `CarrierSettingsSchema`
- export `DEFAULT_CARRIER_SETTINGS`
- enforce:
  - `displayId` string default `"egg"`
  - `radius` number min `1`, default `12`

**Interface**
- consumed by config schemas
- consumed by `CarrierEditor`
- consumed by `SpawnCarrierHandler`

---

### `src/engine/runtime/types/runtimeCommandPayloadsCarrier.ts`
**Responsibility**
- define the runtime payload for `SPAWN_CARRIER`

**Logic**
- export `SpawnCarrierCommandPayload`
- payload fields:
  - `id?`
  - `x?`
  - `y?`
  - `arrived?`
  - `tags`
  - `commands`

**Interface**
- imported by `runtimeCommandCarrier.ts`
- re-exported from runtime type barrels

---

### `src/engine/runtime/types/runtimeCommandCarrier.ts`
**Responsibility**
- define the typed runtime command alias for `SPAWN_CARRIER`

**Logic**
- export `SpawnCarrierCommand`

**Interface**
- included in `RuntimeCommand` union and runtime type barrels

---

### `src/game/carriers/carrier.ts`
**Responsibility**
- own carrier runtime constants and carrier entity selectors

**Logic**
- define `CARRIER_ARRIVED_STATE_KEY = "carrier_arrived"`
- define type guards / readers:
  - `isCarrierEntity`
  - `readCarrierCommands`
  - `hasCarrierArrived`
- carrier identity is determined by the `carrier` component, not tags

**Interface**
- used by `CarrierSystem`
- used by `CarrierInteractionSystem`
- used by known-habiti helpers
- used by rebirth carryover extraction

---

### `src/game/carriers/carrierMotion.ts`
**Responsibility**
- own the extracted carrier orbit math

**Logic**
- move the unchanged numeric rules from `pendingHabitiPickupMotion.ts`
- export:
  - `hasReachedCave`
  - `resolveCarrierOrbitPosition`

**Interface**
- used only by `CarrierSystem`

---

### `src/game/handlers/SpawnCarrierHandler.ts`
**Responsibility**
- apply `SPAWN_CARRIER`

**Logic**
- validate payload
- resolve position
- parse carrier settings
- create/replace runtime entity
- create/register physics body
- initialize display, carrier component, and hidden arrived state

**Interface**
- registered in `registerGameCommandHandlers`
- handles `RuntimeCommandType.SPAWN_CARRIER`

---

### `src/game/handlers/GainHabitiHandler.ts`
**Responsibility**
- apply `GAIN_HABITI`

**Logic**
- validate entity
- validate cave component
- validate habitus id
- no-op if already owned
- update `ownedHabiti`
- for `sys_world`:
  - mirror `habitus_owned`
  - enqueue habitus announcement
  - sync resource-gain bonuses

**Interface**
- registered in `registerGameCommandHandlers`
- handles `RuntimeCommandType.GAIN_HABITI`

---

### `src/game/handlers/executeBehaviorActionList.ts`
**Responsibility**
- centralize execution of an in-memory `BehaviorAction[]` list through `ActionExecutor`

**Logic**
- build a `Snapshot`
- build globals buffer
- build assignment map
- iterate the action list
- execute each action with caller-specified:
  - `self`
  - `sourceLane`

**Interface**
- called by `triggerDraftCompletion.ts`
- called by `CarrierInteractionSystem`

This file exists to avoid duplicating the same behavior-action execution scaffolding in multiple places.

---

### `src/game/habiti/habitiIds.ts`
**Responsibility**
- own habitus id normalization

**Logic**
- move `normalizeHabitiIds` out of the deleted `pendingHabiti.ts`

**Interface**
- used by:
  - `resolveAbsorptionHabitiOutcome.ts`
  - `knownHabiti.ts`
  - `GainHabitiHandler.ts`
  - any tests that need stable normalized ids

---

### `src/game/habiti/knownHabiti.ts`
**Responsibility**
- derive cave known-habiti state from owned ids plus live carriers

**Logic**
- export:
  - `readOwnedHabiti`
  - `readPendingCarrierHabiti`
  - `readKnownHabiti`
- direct carrier inspection only
- only direct top-level `GAIN_HABITI` actions count as pending habitus grants

**Interface**
- used by:
  - habiti processing
  - absorption preview
  - pointer helpers

---

### `src/game/systems/CarrierSystem.ts`
**Responsibility**
- own carrier movement, recovery, arrival transition, and orbit positioning

**Logic**
- gather carrier entities
- sort by id
- drive seek / arrive / orbit flow
- re-enqueue `SPAWN_CARRIER` for carriers whose physics body is missing

**Interface**
- registered in `game/main.ts`

---

### `src/game/systems/CarrierInteractionSystem.ts`
**Responsibility**
- execute carrier payloads when the selected entity is a carrier

**Logic**
- read selected entity id from `sys_world`
- resolve selected entity
- if selected entity is a carrier:
  - execute `carrier.commands` through `executeBehaviorActionList`
  - use `sourceLane = "carrier_interaction"`

**Interface**
- registered in `game/main.ts`

---

### `src/ui/devtools/editors/config/carrier/CarrierEditor.tsx`
**Responsibility**
- provide the dedicated `.cave` carrier editor

**Logic**
- render `SchemaForm` for `config.settings.carrier`
- expose only:
  - radius
  - displayId
- provide a button to open the linked display asset in the existing view editor modal
- do not expose any command-seeding controls

**Interface**
- routed from the system config dashboard as `carrier::${filename}`

---

### `src/engine/linker/semanticParser.carrier.test.ts`
**Responsibility**
- verify `.cave` accepts the new `carrier` top-level section

**Logic**
- parse valid carrier section
- reject invalid carrier section shape

**Interface**
- parser unit test only

---

## 7.2 Changed files

### `src/data/schemas/blueprintConfig.ts`
**Responsibility**
- include carrier settings in module config

**Logic**
- add `settings.carrier: CarrierSettingsSchema.optional()`
- update defaults to include `DEFAULT_CARRIER_SETTINGS`

**Interface**
- carrier config is available at `config.settings.carrier`

---

### `src/data/schemas/v2/config.ts`
**Responsibility**
- include carrier settings in the sys config schema used by `.cave` parsing and runtime config access

**Logic**
- add `carrier: CarrierSettingsSchema.default(DEFAULT_CARRIER_SETTINGS)`

**Interface**
- `SysConfigSchema` accepts/produces carrier settings

---
### `src/data/schemas/game/cave.ts`
**Responsibility**
- remove obsolete cave pending-habiti state

**Logic**
- delete `pendingHabiti` from `CaveComponentSchema`

**Interface**
- cave state contains only durable owned knowledge, not live pickup transport state

---

### `src/engine/runtime/handlers/updateCaveHandler.helpers.ts`
**Responsibility**
- keep cave mutation helpers aligned with the cave component contract

**Logic**
- remove `applyPendingHabiti`
- retain `applyOwnedHabiti` and `applyOwnedUnderstanding`

**Interface**
- there is no helper for pending habitus cave state because that state no longer exists

---

### `src/engine/runtime/handlers/UpdateCaveHandler.ts`
**Responsibility**
- apply cave updates that match the real cave schema

**Logic**
- remove all `pendingHabiti` handling

**Interface**
- `UPDATE_CAVE` no longer accepts or mutates pending habitus ids

---


### `src/engine/linker/semanticParser.ts`
**Responsibility**
- accept `carrier` in `.cave` files

**Logic**
- extend the `.cave` schema with top-level `carrier`

**Interface**
- `.cave` semantic parsing accepts:
  - `carrier: { displayId, radius }`

---

### `src/lib/modules/buildCaveBlueprintConfig.ts`
**Responsibility**
- map `.cave` fragments into runtime module config

**Logic**
- copy top-level `carrier` into `config.settings.carrier`

**Interface**
- linked module cartridges include carrier settings

---

### `src/lib/modules/fragmentSerializers.ts`
**Responsibility**
- serialize carrier settings back into `.cave`

**Logic**
- emit top-level `carrier` from `m.config?.settings?.carrier`

**Interface**
- round-trip preservation of `.cave` carrier settings

---

### `src/engine/terminal/commands/projectCartridgeAdapter.ts`
**Responsibility**
- preserve carrier settings when converting runtime cartridges back into module cartridges

**Logic**
- copy `config.settings.carrier`

**Interface**
- devtools/editor reload preserves the carrier section

---

### `src/data/schemas/behaviorTypes.ts`
**Responsibility**
- define new behavior action types

**Logic**
- add:
  - `GainHabitiAction`
  - `SpawnCarrierAction`
- extend `BehaviorAction` union

**Interface**
- `GAIN_HABITI` flat action
- `SPAWN_CARRIER` nested action

---

### `src/data/schemas/behaviorCoreSchemas.ts`
**Responsibility**
- validate the new behavior actions

**Logic**
- add:
  - `GainHabitiActionSchema`
  - `SpawnCarrierActionSchema`
- `SpawnCarrierActionSchema.commands` must be recursive `BehaviorAction[]`
- `tags` and `commands` must be non-empty

**Interface**
- used by all authored behavior validation

---

### `src/data/schemas/behavior.ts`
**Responsibility**
- expose the new action schemas through the existing `BehaviorActionSchema` union

**Logic**
- add both schemas to the union
- export both action types

**Interface**
- all authored behavior locations can contain `GAIN_HABITI` and `SPAWN_CARRIER`

---

### `src/engine/runtime/commandMetadata.ts`
**Responsibility**
- extend command provenance lanes

**Logic**
- add `carrier_interaction` to `RuntimeCommandSourceLane`

**Interface**
- emitted commands from carrier interaction have correct provenance

---

### `src/engine/runtime/types/runtimeCommandTypes.ts`
**Responsibility**
- declare new runtime command types and remove the obsolete one

**Logic**
- add:
  - `SPAWN_CARRIER`
  - `GAIN_HABITI`
- remove:
  - `CLAIM_PENDING_HABITI_PICKUP`

**Interface**
- runtime type enum matches the new acquisition model

---
### `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`
**Responsibility**
- keep cave/update payloads aligned with the updated cave schema

**Logic**
- remove `pendingHabiti` from `UpdateCaveCommandPayload`

**Interface**
- `UPDATE_CAVE` cannot carry pending habitus ids anymore

---


### `src/engine/runtime/types/runtimeCommandPayloadsHabiti.ts`
**Responsibility**
- keep habiti-domain runtime payloads

**Logic**
- add `GainHabitiCommandPayload`
- remove `ClaimPendingHabitiPickupCommandPayload`

**Interface**
- habiti runtime payloads are first-class and pickup-claim payloads disappear

---

### `src/engine/runtime/types/runtimeCommandHabiti.ts`
**Responsibility**
- keep habiti-domain command aliases

**Logic**
- add `GainHabitiCommand`
- remove `ClaimPendingHabitiPickupCommand`

**Interface**
- habiti runtime commands are typed without the obsolete claim command

---

### `src/engine/runtime/types/runtimeCommandPayloads.ts`
**Responsibility**
- re-export runtime payload types

**Logic**
- export `SpawnCarrierCommandPayload`
- export `GainHabitiCommandPayload`
- stop exporting `ClaimPendingHabitiPickupCommandPayload`

**Interface**
- all public runtime payload exports remain complete and correct

---

### `src/engine/runtime/types/runtimeCommandUnion.ts`
**Responsibility**
- keep the complete runtime command union accurate

**Logic**
- include `SpawnCarrierCommand`
- include `GainHabitiCommand`
- remove `ClaimPendingHabitiPickupCommand`

**Interface**
- `RuntimeCommand` matches the runtime command set

---

### `src/engine/runtime/types.ts`
**Responsibility**
- update root runtime type exports

**Logic**
- re-export:
  - `SpawnCarrierCommandPayload`
  - `GainHabitiCommandPayload`
  - `SpawnCarrierCommand`
  - `GainHabitiCommand`
- stop re-exporting the obsolete claim command payload/type

**Interface**
- all runtime consumers import correct carrier/habiti command types from one place

---

### `src/engine/runtime/runtimeInvalidationSummary.helpers.ts`
**Responsibility**
- keep runtime invalidation tracking aligned with command semantics

**Logic**
- remove the `CLAIM_PENDING_HABITI_PICKUP` branch
- add `SPAWN_CARRIER` as an entity-list-changing command
- add `GAIN_HABITI` as a world-affecting command

**Interface**
- UI invalidation stays correct when carriers spawn and habiti are granted

---

### `src/engine/runtime/systems/behavior/ActionExecutor.ts`
**Responsibility**
- dispatch the new authored actions

**Logic**
- add `GAIN_HABITI`
- add `SPAWN_CARRIER`
- route them to dedicated executor helpers

**Interface**
- behavior rules can emit both actions through the normal pipeline

---

### `src/engine/runtime/systems/behavior/actionExecutorGainUnderstanding.ts`
**Responsibility**
- unchanged logic, but no semantic changes required

**Logic**
- no behavior change
- keep as-is

**Interface**
- retained for symmetry with the new `actionExecutorGainHabiti.ts`

No code change is required here.

---

### `src/engine/runtime/systems/behavior/actionExecutorGainHabiti.ts`
**Responsibility**
- translate authored `GAIN_HABITI` into runtime `GAIN_HABITI`

**Logic**
- mirror `actionExecutorGainUnderstanding.ts`
- default `entityId` to `sys_world`

**Interface**
- flat behavior action -> flat runtime command

---

### `src/engine/runtime/systems/behavior/actionExecutorSpawnCarrier.ts`
**Responsibility**
- translate authored `SPAWN_CARRIER` into runtime `SPAWN_CARRIER`

**Logic**
- resolve the source entity position using the same self-body lookup style already used by `SPAWN_BODY`
- emit:
  - `tags`
  - `commands`
  - `x`
  - `y`

**Interface**
- authored nested carrier action -> runtime spawn command

---

### `src/game/registerGameCommandHandlers.ts`
**Responsibility**
- register the correct handlers

**Logic**
- register:
  - `SpawnCarrierHandler`
  - `GainHabitiHandler`
- unregister:
  - `ClaimPendingHabitiPickupHandler`

**Interface**
- command registration matches the new command set

---

### `src/game/main.ts`
**Responsibility**
- register the correct systems

**Logic**
- register:
  - `CarrierSystem`
  - `CarrierInteractionSystem`
- unregister:
  - `PendingHabitiPickupSystem`
  - `ClaimPendingHabitiPickupSystem`

**Interface**
- runtime system graph matches the carrier design

---

### `src/game/handlers/resolveBodyProcessingCommand.ts`
**Responsibility**
- trigger habiti reward spawning during processing

**Logic**
- update imports if `processingPendingHabiti.ts` is renamed
- keep the call site behavior the same: processing still decides habiti rewards here

**Interface**
- body processing continues to invoke the habiti reward sync point

---

### `src/game/handlers/processingPendingHabiti.ts`
**Responsibility**
- change from “update cave pending state + spawn pickup blueprint” to “spawn carriers for new habiti”

**Logic**
- remove all `pendingHabiti` reads/writes
- compute new habiti exactly as now
- use `readKnownHabiti(world, context.world.entities)` for duplicate prevention
- for each new habitus:
  - emit `SPAWN_CARRIER`
  - pass caller-owned tag paths
  - seed commands:
    - `GAIN_HABITI`
    - `KILL self`

**Interface**
- function signature remains the same unless a rename is chosen
- behavior changes exactly at the acquisition transport layer, not at the reward calculation layer

---

### `src/game/handlers/absorptionBatchProcessingOutcome.ts`
**Responsibility**
- derive known habiti correctly for processing batches

**Logic**
- replace `pendingHabiti`-based helper usage with the new live-carrier-aware helper

**Interface**
- processing outcome duplicate prevention uses live carrier state

---
### `src/game/handlers/absorptionBatchProcessing.ts`
**Responsibility**
- pass enough context for batch processing to derive known habiti from live carriers

**Logic**
- if `createProcessingOutcome` or related helpers require live entities, thread `context.world.entities` through the habiti context explicitly

**Interface**
- batch-processing helpers receive the minimum additional context they need and nothing more

---


### `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`
**Responsibility**
- keep habitus id normalization after deleting `pendingHabiti.ts`

**Logic**
- import normalization from `habitiIds.ts`

**Interface**
- no semantic behavior change

---

### `src/game/handlers/triggerDraftCompletion.ts`
**Responsibility**
- reuse the new shared behavior-action execution helper

**Logic**
- delegate to `executeBehaviorActionList.ts`
- preserve existing `sourceLane = "draft_on_complete"`

**Interface**
- no behavior change

---

### `src/game/systems/pointer/pointerKnownHabiti.ts`
**Responsibility**
- expose live known-habiti state to pointer logic

**Logic**
- replace old helper import with the new live-carrier-aware helper

**Interface**
- pointer systems continue to consume a single helper

---

### `src/ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`
**Responsibility**
- compute duplicate/new habitus previews correctly

**Logic**
- remove `readPendingHabiti`
- compute known habiti from:
  - `ownedHabiti`
  - live carrier payloads
- duplicate entries must treat live habitus carriers as already pending

**Interface**
- preview results remain user-correct without cave pending state

---

### `src/ui/runtime/terminal/commands/gameRebirthSupport.ts`
**Responsibility**
- extract and restore the correct rebirth carryover data

**Logic**
- stop treating `pendingHabiti` as rebirth state
- add extraction helpers for live carriers:
  - `extractRebirthCarriers`
  - `enqueueRebirthCarriers` or equivalent
- carrier carryover must include:
  - id
  - tags
  - commands
  - x
  - y
  - arrived

**Interface**
- rebirth support now preserves live carriers rather than cave pending ids

---

### `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`
**Responsibility**
- restore cave state and live carriers after rebirth

**Logic**
- remove `pendingHabiti` from the `UPDATE_CAVE` payload
- restore carriers through `SPAWN_CARRIER`
- keep passport permanent carryover unchanged

**Interface**
- rebirth preserves the same gameplay state without redundant cave pending data

---

### `src/ui/devtools/editors/file/SystemConfigEditor.tsx`
**Responsibility**
- expose the new carrier editor in the system config dashboard

**Logic**
- add a “Carrier Editor” card
- route to `carrier::${filename}`

**Interface**
- `.cave` dashboards expose carrier authoring

---

### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`
**Responsibility**
- route the new config editor component

**Logic**
- map `carrier` to `CarrierEditor`

**Interface**
- route resolution supports the carrier editor

---

### `src/ui/devtools/shell/window-manager/virtualPath.types.ts`
**Responsibility**
- add the new config route kind

**Logic**
- add `{ kind: "carrier"; filename: string }`

**Interface**
- carrier editor has a first-class virtual path

---

### `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts`
**Responsibility**
- serialize the new virtual path kind

**Logic**
- add `carrier::${filename}` serialization

**Interface**
- carrier tabs/routes are serializable

---

### `src/ui/devtools/shell/window-manager/tabIds.ts`
**Responsibility**
- generate stable tab ids for the carrier editor

**Logic**
- add `carrier:${filename}`

**Interface**
- the carrier editor has a stable tab identity

---

### `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`
**Responsibility**
- reverse-map carrier tab ids back to virtual paths

**Logic**
- add the `carrier:` prefix mapping

**Interface**
- tab restore/navigation works for carrier tabs

---

### `src/ui/devtools/shell/window-manager/hooks/openConfigRouteTab.ts`
**Responsibility**
- treat the carrier editor as a supported config route

**Logic**
- include `carrier` in `ConfigPath`

**Interface**
- generic config-route tab opening supports carrier

---

### `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`
**Responsibility**
- register a named route handler for the carrier editor

**Logic**
- add `carrier: buildHandler(context, "carrier", "Carrier Editor")`

**Interface**
- route dispatch opens the carrier editor

---

### `src/ui/devtools/editors/draft/options/actionText.ts`
**Responsibility**
- render new actions in action lists

**Logic**
- add:
  - `GAIN_HABITI`
  - `SPAWN_CARRIER`
- `SPAWN_CARRIER` must render as a summary only, for example:
  - display the tag count
  - display the nested command count
- it must not attempt to inline the nested command sequence into one sentence

**Interface**
- action list rendering remains exhaustive and stable

---

### `src/ui/devtools/editors/behaviors/compiler/constants.ts`
**Responsibility**
- expose only the supported flat sentence verbs

**Logic**
- add `GAIN_HABITI`
- do not add `SPAWN_CARRIER`

**Interface**
- sentence authoring supports `GAIN_HABITI`
- sentence authoring does not advertise unsupported nested carrier authoring

---

### `src/ui/devtools/editors/draft/options/useActionAutocomplete.ts`
**Responsibility**
- autocomplete supported flat verbs

**Logic**
- add `GAIN_HABITI`
- do not add `SPAWN_CARRIER`

**Interface**
- autocomplete remains aligned with actual text-parser support

---

### `src/ui/devtools/editors/behaviors/autocomplete/behaviorStateMachine.constants.ts`
**Responsibility**
- expose effect verbs for the sentence-based behavior editor

**Logic**
- add `GAIN_HABITI`
- do not add `SPAWN_CARRIER`

**Interface**
- state-machine autocomplete remains truthful

---

### `src/ui/devtools/editors/behaviors/compiler/actionCompiler.parse.ts`
**Responsibility**
- parse new supported flat actions and explicitly reject unsupported nested carrier text syntax

**Logic**
- add `GAIN_HABITI`
- if `SPAWN_CARRIER` is encountered in sentence input:
  - throw an explicit error saying JSON authoring is required because nested commands are not supported by the sentence compiler

**Interface**
- no silent parser failure
- no hidden partial support

---

### `src/ui/devtools/editors/behaviors/compiler/actionCompiler.gainHabiti.ts`
**Responsibility**
- parse sentence-form `GAIN_HABITI`

**Logic**
- mirror `actionCompiler.gainUnderstanding.ts`

**Interface**
- returns a typed `GainHabitiAction`

---

### `src/data/raw/example/modules/core.cave`
**Responsibility**
- define example carrier settings

**Logic**
- add top-level `carrier`
- use current pickup defaults unless intentionally changing visuals:
  - `displayId: "egg"`
  - `radius: 12`

**Interface**
- example runtime remains visually unchanged after pickup blueprint deletion

---

### `src/data/raw/example/modules/progression.draft`
**Responsibility**
- migrate authored understanding rewards to carrier spawning

**Logic**
- replace direct `GAIN_UNDERSTANDING` entries with `SPAWN_CARRIER`
- nested commands must end with `KILL self`

**Interface**
- progression rewards use the physical pickup flow

---

### `src/data/raw/example/modules/understanding/do_locals_know_of_me.bp`
### `src/data/raw/example/modules/understanding/does_patriarchy_know_of_me.bp`
### `src/data/raw/example/modules/understanding/how_big_can_i_get.bp`
### `src/data/raw/example/modules/understanding/how_did_i_come_to_be.bp`
### `src/data/raw/example/modules/understanding/how_hard_can_i_go.bp`
### `src/data/raw/example/modules/understanding/what_am_i.bp`
**Responsibility**
- migrate authored understanding rewards to carrier spawning

**Logic**
- replace direct `GAIN_UNDERSTANDING` triggered actions with `SPAWN_CARRIER`
- nested commands must be:
  - `GAIN_UNDERSTANDING <id>`
  - `KILL self`
- supply canonical tag paths from the existing tagging system

**Interface**
- example authored understandings now reward a carrier instead of granting immediately

---

### `src/data/raw/example/manifest.json`
**Responsibility**
- stop loading the deleted pickup blueprint file

**Logic**
- remove `modules/pending_habiti_pickup.bp`

**Interface**
- example manifest matches actual files

---

## 7.3 Files to delete

### `src/game/habiti/pendingHabiti.ts`
Delete entirely.

Reason:
- the file’s purpose is cave `pendingHabiti` state and pickup-id encoding
- that state model is removed

Replacement:
- `habitiIds.ts`
- `knownHabiti.ts`
- `game/carriers/carrier.ts`

---

### `src/game/habiti/pendingHabitiPickupCommands.ts`
Delete entirely.

Reason:
- pickup spawning/restoration is replaced by `SPAWN_CARRIER`

---

### `src/game/systems/PendingHabitiPickupSystem.ts`
Delete entirely.

Reason:
- cave pending-state reconciliation no longer exists

Replacement:
- `CarrierSystem.ts`

---

### `src/game/systems/pendingHabitiPickupLifecycle.ts`
Delete entirely.

Reason:
- logic is absorbed into `CarrierSystem.ts`

---

### `src/game/systems/pendingHabitiPickupMotion.ts`
Delete entirely after moving the unchanged numeric rules into `game/carriers/carrierMotion.ts`.

---

### `src/game/systems/ClaimPendingHabitiPickupSystem.ts`
Delete entirely.

Reason:
- selection now directly executes carrier payloads through `CarrierInteractionSystem`

---

### `src/game/handlers/ClaimPendingHabitiPickupHandler.ts`
Delete entirely.

Reason:
- the one-off claim command is replaced by first-class `GAIN_HABITI`

---

### `src/data/raw/example/modules/pending_habiti_pickup.bp`
Delete entirely.

Reason:
- carrier visuals/radius move into `.cave` settings
- carriers are no longer blueprint-defined

---

## 8. Test plan

All tests must follow the uploaded testing standard:
- behavior over implementation
- Given / When / Then structure
- real world/runtime objects where practical
- no mock ECS world for system tests

## 8.1 New unit tests

### `src/data/schemas/game/carrier.test.ts`
Verify:
- defaults are `"egg"` and `12`
- `radius < 1` is rejected
- missing `displayId` defaults correctly

### `src/game/habiti/habitiIds.test.ts`
Verify:
- dedupe
- sort
- empty filtering

### `src/game/habiti/knownHabiti.test.ts`
Verify:
- owned-only result
- owned + live carrier `GAIN_HABITI`
- ignores carriers without `GAIN_HABITI`
- ignores nested/non-top-level `GAIN_HABITI`

### `src/game/handlers/GainHabitiHandler.test.ts`
Verify:
- grants owned habitus
- no-ops if already owned
- logs on unknown habitus
- logs on missing entity
- logs on missing cave component
- mirrors fact, syncs bonuses, and announces for `sys_world`

### `src/game/handlers/SpawnCarrierHandler.test.ts`
Verify:
- spawns entity with correct physics defaults
- uses `.cave` carrier settings
- preserves caller tags exactly
- initializes hidden arrived state
- resolves position from explicit coordinates
- resolves position from `sourceEntityId`
- falls back to `sys_world` position
- logs loudly on invalid payload

### `src/engine/runtime/systems/behavior/ActionExecutor.gainHabiti.test.ts`
Verify:
- `GAIN_HABITI` authored action emits runtime `GAIN_HABITI`
- metadata contains the correct source lane and source entity id

### `src/engine/runtime/systems/behavior/ActionExecutor.spawnCarrier.test.ts`
Verify:
- `SPAWN_CARRIER` authored action emits runtime `SPAWN_CARRIER`
- position resolves from the source entity physics
- nested command list is preserved

## 8.2 New integration/system tests

### `src/game/systems/CarrierSystem.test.ts`
Verify:
- navigating carriers target `sys_world`
- carriers flip to arrived at the same distance threshold as today
- arrived carriers switch to phantom layer
- arrived carriers are positioned on deterministic orbit slots
- carriers are sorted by entity id before orbit slot assignment

### `src/game/systems/CarrierSystem.recovery.test.ts`
Verify:
- a live carrier entity with no physics body is recreated through `SPAWN_CARRIER`
- its id, arrived state, tags, and command payload are preserved

### `src/game/systems/CarrierInteractionSystem.test.ts`
Verify:
- non-carrier selection does nothing
- carrier selection executes the seeded command list
- commands carry `carrier_interaction` provenance
- `KILL self` removes the carrier through the normal command path

### `src/game/handlers/processingPendingHabiti.test.ts`
Update existing test to verify:
- no `UPDATE_CAVE.pendingHabiti`
- emits `SPAWN_CARRIER`
- seeded payload is `[GAIN_HABITI, KILL self]`

### `src/game/handlers/processingPendingHabiti.multiple.test.ts`
Update existing test to verify:
- multiple new habiti produce multiple carriers
- no duplicate carrier for already known habiti

### `src/ui/runtime/terminal/commands/gameRebirthCommand.integration.test.ts`
Update existing test to verify:
- cave state is preserved without `pendingHabiti`
- live carriers are carried over and restored
- passport permanent carryover remains unchanged

## 8.3 Parser/editor tests

### `src/engine/linker/semanticParser.carrier.test.ts`
Verify:
- `.cave` accepts `carrier`
- invalid carrier shape is rejected

### `src/ui/devtools/shell/window-manager/virtualPath.carrier.test.ts`
Verify:
- serialization and reverse mapping for `carrier::filename`

### `src/ui/devtools/shell/window-manager/WindowLayoutResolver.carrier.test.tsx`
Verify:
- `carrier` resolves to `CarrierEditor`

### `src/ui/devtools/editors/behaviors/compiler/actionCompiler.gainHabiti.test.ts`
Verify:
- sentence compiler parses `GAIN_HABITI`

### `src/ui/devtools/editors/behaviors/compiler/actionCompiler.spawnCarrier.rejection.test.ts`
Verify:
- sentence compiler rejects `SPAWN_CARRIER` with the explicit JSON-authoring error

## 8.4 Tests to delete or rewrite because the old contract is gone

Delete:
- `src/engine/runtime/handlers/UpdateCaveHandler.pendingHabiti.test.ts`
- `src/game/habiti/pendingHabiti.test.ts`
- `src/game/handlers/ClaimPendingHabitiPickupHandler.test.ts`
- `src/game/systems/ClaimPendingHabitiPickupSystem.test.ts`
- `src/game/systems/PendingHabitiPickupSystem.test.ts`
- `src/game/systems/PendingHabitiPickupSystem.travel.test.ts`

Reason:
- they test deleted concepts:
  - cave `pendingHabiti`
  - pending pickup ids
  - claim command
  - pending pickup reconciliation

## 9. Migration sequence

The implementation order must be:

1. Add carrier settings schema and `.cave` plumbing.
2. Add runtime command types for `SPAWN_CARRIER` and `GAIN_HABITI`.
3. Add behavior action schemas and executor support.
4. Add `SpawnCarrierHandler` and `GainHabitiHandler`.
5. Add carrier selectors/motion/system/interaction.
6. Add live known-habiti derivation helpers.
7. Migrate habiti processing to `SPAWN_CARRIER`.
8. Migrate example understanding rewards to `SPAWN_CARRIER`.
9. Update rebirth carryover.
10. Delete obsolete pending-pickup files and tests.
11. Add/update all tests.
12. Run the full test suite and fix any remaining type/exhaustiveness fallout.

No step may leave both systems partially active at the same time.

## 10. Acceptance criteria

The change is complete only when all of the following are true:

1. `pendingHabiti` no longer exists in cave schema, cave updates, rebirth state, or gameplay logic.
2. `CLAIM_PENDING_HABITI_PICKUP` no longer exists in runtime command types, handlers, systems, or tests.
3. `pending_habiti_pickup.bp` is deleted and no manifest references remain.
4. Habiti rewards from processing spawn carriers instead of updating cave pending state.
5. Understanding rewards in the example content spawn carriers instead of granting directly.
6. Carrier entities:
   - use `.cave` carrier radius/display settings
   - navigate to cave
   - orbit cave after arrival
   - execute seeded payloads on selection
7. `GAIN_HABITI` exists and is the only first-class habitus grant path.
8. Rebirth preserves live carriers.
9. The `.cave` system dashboard exposes a dedicated carrier editor with only radius and display authoring.
10. All deleted behavior is removed, not left dormant.
11. All tests pass.

## 11. Explicit non-goals

The following are intentionally excluded from this change:

- generalizing body assignment/orbit logic into a shared abstraction
- adding a carrier kind enum
- adding carrier blueprint support
- adding per-carrier radius/display overrides
- adding automatic kill injection
- adding a new sentence DSL for nested `SPAWN_CARRIER` authoring
- scanning arbitrarily nested action trees when deriving pending habitus grants

These can be revisited later only if explicitly requested.
