# Understanding Feature LLD

## 1. Why

### 1.1 Feature objective

Add a new authored registry, runtime acquisition path, and Cave UI surface for **Understanding**.

Understanding must be:

- authored from `.cave`
- editable from a top-level devtools editor card, at the same level as Body Editor, Codex, Tutorials, and the other system-config editors
- gainable at runtime through a dedicated command, `GAIN_UNDERSTANDING`
- callable from `triggeredAction` through the existing behavior-action pipeline
- displayed on the Cave card in a dedicated section
- effect-bearing, using the same effect model already used by Habiti

### 1.2 Why this design

The codebase already has stable seams for each part of the feature:

- `.cave` authoring is already parsed and serialized through the semantic fragment pipeline
- config editors are routed through virtual paths and config-editor resolution
- runtime mutations already flow through typed runtime commands and registered handlers
- `triggeredAction` already emits behavior actions that are translated into runtime commands by `ActionExecutor`
- Cave bonus aggregation already exists for Habiti and already feeds multiple downstream consumers
- Cave card rendering already has a reusable list component for pill-based authored effects

The correct implementation therefore extends those seams rather than creating a side channel.

---

## 2. What

## 2.1 New authored concept

Add a new authored registry:

- path in module config: `config.understanding`
- path in `.cave`: top-level `understanding`

Each Understanding definition has exactly these authored fields:

- `id`
- `label`
- `description`
- `effects`

No other authored fields are part of Understanding.

In particular, Understanding does **not** have:

- `summary`
- `type`
- `excludes`

Those are Habiti-specific and are not to be copied.

## 2.2 New runtime cave state

Add a new Cave-owned registry:

- `cave.ownedUnderstanding: string[]`

This is the runtime source of truth for which Understanding entries the Cave owns.

## 2.3 New runtime command

Add a new runtime command:

- `GAIN_UNDERSTANDING`

Its payload contract is:

- `entityId: string`
- `understandingId: string`

The command mutates runtime Cave state during apply, not from UI and not from behavior systems directly.

## 2.4 New behavior action

Add a new behavior action:

- `type: "GAIN_UNDERSTANDING"`

Its authored action contract is:

- `understandingId: string`
- `entityId?: string`

Default target is `self` when the action is executed by `ActionExecutor`.

This action is legal inside `triggeredActions`, draft payloads, and every other place that already accepts `BehaviorActionSchema`.

## 2.5 Cave display contract

Add a new section to the Cave card:

- section title: `Understanding`
- source: `cave.ownedUnderstanding`
- display semantics: the same pill list UI used by Habiti

Display content per item is:

- pill title = authored `label`
- tooltip body = authored `description` and formatted effect descriptions
- summary line = empty, because Understanding has no authored summary

## 2.6 Effect contract

Understanding uses the **existing Habiti effect model** unchanged.

The effect schema is reused as-is.

Understanding effects must contribute to the same live cave calculations that Habiti already contribute to:

- cave attribute bonuses
- absorption XP conversion bonus
- resource gain multipliers
- producer-output multipliers
- hidden world bonus state used by existing runtime consumers
- previews and tooltips that already explain those bonuses

No second effect system is introduced.

---

## 3. Non-goals

This LLD does **not** include:

- any new announcement modal for Understanding
- any new persistence format beyond the existing runtime/entity serialization path
- any new effect types
- any redesign of Habiti
- any refactor of BehaviorSystem or command processing architecture
- any state-key rename for existing hidden Habiti bonus state

Existing hidden bonus state keys remain unchanged and continue to represent the total Cave bonus, now sourced from both Habiti and Understanding.

---

## 4. Current-code facts that constrain the design

The following facts are already true in the code and drive the design:

1. `.cave` accepts specific top-level collections in `engine/linker/semanticParser.ts`, and `toCaveModule` / `serializeCaveFragment` are the conversion seam for those collections.
2. `BlueprintConfigSchema` currently exposes `config.habiti` but no `config.understanding`.
3. Cave runtime state currently stores `ownedHabiti` in `data/schemas/game/cave.ts`.
4. `triggeredAction` accepts `BehaviorActionSchema`, and `ActionExecutor` translates most behavior actions into runtime commands.
5. `BehaviorSystem` special-cases only `TRIGGER_DRAFT`; all other behavior actions go through `ActionExecutor`.
6. `CommandsManager` keeps one registered handler per `RuntimeCommandType`.
7. The current Cave card already renders Habiti through `resolveCaveCardData` and `HabitiList`.
8. Habiti effects already feed multiple consumers beyond the Cave card: cave attributes, hidden world bonus state, absorption preview, job analysis tooltip generation, save-load replay, and rebirth carryover.
9. The top-level config dashboard is wired through system-config cards, virtual-path parsing/serialization, tab-id mapping, route handlers, and config-editor resolution. A new top-level editor must be added at all of those seams.
10. The Texts Editor has an explicit whitelist for `.cave` text owners. New authored text will not appear there unless the whitelist is extended.

This feature must respect all ten facts.

---

## 5. Target contract

## 5.1 Authoring contract

A `.cave` file may contain a top-level `understanding` record.

That record is round-tripped losslessly through:

- semantic parse
- module conversion
- module draft editing
- semantic serialization

`config.understanding` is the canonical in-memory location after parse.

## 5.2 Editor contract

The system-config dashboard contains an `Understanding` card.

Opening that card routes to a dedicated `UnderstandingEditor`.

The editor supports:

- add definition
- delete definition
- rename definition id
- edit label
- edit description
- edit effects

The editor does not expose Habiti-only fields.

## 5.3 Runtime contract

`GAIN_UNDERSTANDING` behaves as follows:

- target entity must exist
- target entity must have a cave component
- `understandingId` must exist in authored `config.understanding`
- if the target already owns the id, the command is a no-op
- otherwise the id is added to `cave.ownedUnderstanding` as a sorted unique list
- if the target is `sys_world`, existing hidden world bonus state is resynchronized after mutation

Error handling is explicit:

- missing entity: log to telemetry `errors`
- missing cave component: log to telemetry `errors`
- unknown authored id: log to telemetry `errors`

Duplicate gains are not errors.

## 5.4 Behavior-action contract

The authored action syntax is:

- `GAIN_UNDERSTANDING <understandingId>`
- `GAIN_UNDERSTANDING <understandingId> TO <entityRef>`

`entityRef` follows the same entity-reference rules already used by existing action execution utilities.

If `TO` is omitted, the action targets `self`.

The compiler, formatter, and autocomplete surface this verb everywhere the current behavior-action language is exposed.

## 5.5 Effect contract

Every place that currently computes Cave-owned Habiti bonuses must compute Cave-owned **Habiti + Understanding** bonuses.

The merged result is the source of truth for:

- cave attribute totals
- absorption XP conversion
- resource-gain hidden state
- producer-output hidden state
- resource-gain breakdown tooltips
- absorption preview bonus projections

There is one merged bonus calculation, not parallel duplicate calculations.

---

## 6. How

## 6.1 Implementation strategy

Implementation is additive and follows existing seams.

### 6.1.1 Data and authoring

Add a new Understanding schema and thread it through `.cave` parse/serialize and `BlueprintConfigSchema`.

### 6.1.2 Devtools routing and editor

Add a new top-level route kind, tab id, and config-editor case, then implement a dedicated Understanding editor that reuses the existing effect-row tooling.

### 6.1.3 Runtime command path

Add a dedicated `GAIN_UNDERSTANDING` runtime command and handler.

Do **not** overload `UPDATE_CAVE` to perform acquisition semantics.

### 6.1.4 Shared effect application

Introduce one merged Cave-owned bonus resolver that aggregates from:

- `ownedHabiti + config.habiti`
- `ownedUnderstanding + config.understanding`

Then move all existing Habiti-only bonus consumers onto that merged resolver.

### 6.1.5 Direct cave updates

`UPDATE_CAVE` is still extended to understand `ownedUnderstanding`, because save-load replay and rebirth already restore Cave-owned registries through `UPDATE_CAVE`.

### 6.1.6 Display

Expose Understanding on the Cave card by reusing `HabitiList` with a different title and entries whose summary is always empty.

---

## 7. File-by-file design

## 7.1 Authoring schema and `.cave` round-trip

### Add: `src/data/schemas/game/understanding.ts`

**Responsibility**

Define the authored Understanding schema and exported type.

**Logic**

- reuse the existing `HabitusEffectSchema`
- define `UnderstandingDefinitionSchema` with fields:
    - `id`
    - `label`
    - `description`
    - `effects`
- export `UnderstandingDefinition`

**Interface**

Exports:

- `UnderstandingDefinitionSchema`
- `UnderstandingDefinition`

No defaults beyond field defaults already used in the schema.

---

### Change: `src/data/schemas/blueprintConfig.ts`

**Responsibility**

Expose Understanding on `config` alongside `habiti`.

**Logic**

- import `UnderstandingDefinitionSchema`
- add `understanding: z.record(z.string(), UnderstandingDefinitionSchema).default({})`
- include `understanding: {}` in the default object

**Interface**

`BlueprintConfigSchema` gains:

- `config.understanding: Record<string, UnderstandingDefinition>`

No other config shape changes.

---

### Change: `src/engine/linker/semanticParser.ts`

**Responsibility**

Allow `.cave` files to declare top-level `understanding`.

**Logic**

- add optional top-level `understanding: z.record(z.string(), z.unknown()).optional()` to the `.cave` schema
- keep strict top-level validation

**Interface**

Accepted `.cave` top-level keys now include `understanding`.

---

### Change: `src/lib/modules/semanticModuleFragments.ts`

**Responsibility**

Map parsed `.cave` `understanding` into module config.

**Logic**

- in `toCaveModule`, copy top-level `understanding` into `blueprint.understanding`

**Interface**

`toCaveModule("*.cave", raw)` returns a cartridge whose `config.understanding` contains the authored record.

---

### Change: `src/lib/modules/fragmentSerializers.ts`

**Responsibility**

Serialize module config Understanding back into semantic `.cave` form.

**Logic**

- include `understanding: m.config?.understanding ?? {}` in `serializeCaveFragment`

**Interface**

`.cave` semantic serialization round-trips `understanding`.

---

### Change: `src/lib/modules/semanticModuleFragments.cave.test.ts`

**Responsibility**

Verify `.cave` to module conversion and back includes `understanding`.

**Logic**

- extend the existing cave-collections test to include authored Understanding
- assert both forward mapping and reverse serialization

**Interface**

Test contract: Understanding survives round-trip.

---

### Change: `src/engine/linker/semanticParser.test.ts`

**Responsibility**

Verify the semantic parser accepts top-level `understanding`.

**Logic**

- extend the `.cave` acceptance test to include a valid Understanding record
- assert parser success and presence of parsed data

**Interface**

Test contract: `.cave` parser accepts `understanding` without relaxing strictness for unrelated keys.

---

## 7.2 Devtools route surface and config editor entry

### Change: `src/ui/devtools/editors/file/SystemConfigEditor.tsx`

**Responsibility**

Expose Understanding as a first-class system-config dashboard card.

**Logic**

- add a new card titled `Understanding`
- description must describe the authored Understanding registry
- route must be `understanding::<filename>`

**Interface**

The system-config dashboard visibly contains an `Understanding` card at the same level as the existing cards.

---

### Change: `src/ui/devtools/shell/window-manager/virtualPath.constants.ts`

**Responsibility**

Recognize `understanding` as a routed config prefix.

**Logic**

- add `understanding` to `ROUTE_PREFIXES`

**Interface**

`understanding::<filename>` becomes a legal virtual path prefix.

---

### Change: `src/ui/devtools/shell/window-manager/virtualPath.types.ts`

**Responsibility**

Add Understanding to the typed routed-path union.

**Logic**

- add `{ kind: "understanding"; filename: string }`

**Interface**

`VirtualPath` now includes the Understanding config route.

---

### Change: `src/ui/devtools/shell/window-manager/virtualPath.parseRouted.ts`

**Responsibility**

Parse Understanding routes.

**Logic**

- add `understanding` to `SIMPLE_CONFIG_ROUTES`

**Interface**

`parseVirtualPath("understanding::modules/core.cave")` resolves to the Understanding route kind.

---

### Change: `src/ui/devtools/shell/window-manager/virtualPath.serialize.ts`

**Responsibility**

Serialize Understanding routes.

**Logic**

- add a switch case that serializes the Understanding route kind

**Interface**

Understanding routes round-trip through serialize/parse.

---

### Change: `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`

**Responsibility**

Map Understanding tab ids back to virtual paths.

**Logic**

- add `understanding:` to `SIMPLE_PREFIXES`

**Interface**

Understanding tabs reopen and round-trip through tab-id restoration.

---

### Change: `src/ui/devtools/shell/window-manager/tabIds.ts`

**Responsibility**

Generate stable tab ids for the Understanding editor.

**Logic**

- add `kind: "understanding"` to `TabIdParams`
- add `makeTabId` support

**Interface**

Understanding editor tab id format is:

- `understanding:<encoded filename>`

---

### Change: `src/ui/devtools/shell/window-manager/hooks/openConfigRouteTab.ts`

**Responsibility**

Permit Understanding in the config-route helper.

**Logic**

- extend `ConfigPath` to include the new route kind

**Interface**

`openConfigRouteTab` accepts Understanding routes without type assertions outside the helper.

---

### Change: `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`

**Responsibility**

Create a route handler for Understanding.

**Logic**

- add a handler entry that opens the Understanding editor tab with the name `Understanding Editor`

**Interface**

File routing for `understanding::<filename>` opens the correct editor.

---

### Change: `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`

**Responsibility**

Resolve Understanding tabs to the Understanding editor component.

**Logic**

- import `UnderstandingEditor`
- add switch case `"understanding"`

**Interface**

Tab component resolution supports Understanding.

---

### Change: `src/ui/devtools/shell/window-manager/virtualPath.tutorials.test.ts`

**Responsibility**

Mirror the existing simple-route round-trip coverage for Understanding.

**Logic**

- add or replicate the route round-trip test for `understanding`

**Interface**

Test contract: `serializeVirtualPath` and `parseVirtualPath` round-trip Understanding.

---

### Change: `src/ui/devtools/shell/window-manager/WindowLayoutResolver.tutorials.test.tsx`

**Responsibility**

Mirror the existing route-to-editor resolution coverage for Understanding.

**Logic**

- add or replicate the config-editor resolution test for `understanding`

**Interface**

Test contract: tab component `"understanding"` resolves to `UnderstandingEditor`.

---

## 7.3 Understanding editor implementation

### Add: `src/ui/devtools/editors/config/understanding/understandingPaths.ts`

**Responsibility**

Centralize Understanding draft paths.

**Logic**

Define the single source of truth path constant:

- `UNDERSTANDING_PATH = "config.understanding"`

**Interface**

Exports:

- `UNDERSTANDING_PATH`

---

### Add: `src/ui/devtools/editors/config/understanding/understandingEditorDefaults.ts`

**Responsibility**

Provide default authored objects for new Understanding rows.

**Logic**

Create one factory for a default Understanding definition.

Fields:

- `id = generated id`
- `label = "New Understanding"`
- `description = ""`
- `effects = []`

Reuse the existing effect default factory already used by Habiti.

**Interface**

Exports:

- `createDefaultUnderstanding(id: string)`

---

### Add: `src/ui/devtools/editors/config/understanding/useUnderstandingConfigSession.ts`

**Responsibility**

Own all editor-side Understanding registry mutations.

**Logic**

This hook must:

- ensure module session exists
- read `config.understanding` from the draft
- expose `understandingIds`
- expose `understandingIndex`
- expose `addUnderstanding`
- expose `removeUnderstanding`
- expose `renameUnderstanding`

Mutation rules:

- ids are unique
- rename trims input
- empty id returns the same failure sentinel shape already used by Habiti rename
- duplicate target id returns `"duplicate"`
- add inserts a default Understanding definition
- remove deletes only the selected definition

No cross-registry side effects exist, because Understanding has no rule tables analogous to Body/Habiti assignment rules.

**Interface**

Return shape:

- `understandingIndex`
- `understandingIds`
- `addUnderstanding()`
- `removeUnderstanding(id)`
- `renameUnderstanding(oldId, newId): string | null`

---

### Add: `src/ui/devtools/editors/config/understanding/UnderstandingEditor.tsx`

**Responsibility**

Render the full Understanding registry editor.

**Logic**

- use `ToolFrame`
- read session state only through `useUnderstandingConfigSession`
- render one row editor per id
- render a ghost add button at the bottom

No business logic is embedded in this `.tsx` file.

**Interface**

Props:

- `filename: string`

Rendered title:

- `Understanding Editor`

---

### Add: `src/ui/devtools/editors/config/understanding/UnderstandingRowEditor.tsx`

**Responsibility**

Edit a single Understanding definition.

**Logic**

The row contains exactly:

- editable id
- `Label` string field
- `Description` string field
- `HabitusEffectsSection` reused for `effects`

It must **not** render:

- summary
- type
- excludes

The row summary shown in the collapsed header is the authored label, mirroring the existing Habiti row behavior.

**Interface**

Props:

- `filename`
- `understandingId`
- `onDelete`
- `onRename`

Base path:

- `config.understanding.<understandingId>`

---

### Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectsSection.tsx`

**Responsibility**

Remain the shared effect-list editor for Cave-owned authored effect definitions.

**Logic**

- accept an optional semantic label prop for tooltip text
- default remains Habitus behavior
- Understanding reuses the component with wording adjusted to `Understanding`

No behavior change to how effects are added or removed.

**Interface**

Add optional prop:

- `subjectLabel?: string`

Default value:

- `Habitus`

---

### Change: `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`

**Responsibility**

Remain the shared editor row for a single Cave-owned authored effect.

**Logic**

- accept the same optional semantic label prop
- use that prop only for user-facing tooltip/title copy
- do not change field structure or storage path semantics

**Interface**

Add optional prop:

- `subjectLabel?: string`

Default value:

- `Habitus`

---

## 7.4 Text registry integration

### Change: `src/ui/devtools/texts/types.ts`

**Responsibility**

Allow Understanding to participate in the Texts Editor registry.

**Logic**

- add `understanding` to `TEXT_OWNER_TYPES`

**Interface**

`TextOwnerType` gains `understanding`.

---

### Change: `src/ui/devtools/texts/textRegistryCaveSpecs.ts`

**Responsibility**

Whitelist Understanding text fields.

**Logic**

Add a new owner spec for `understanding` with:

- fields:
    - `label`
    - `description`
- list fields:
    - `effects[].description`

No summary field is included.

**Interface**

Understanding text becomes editable/searchable in the Texts Editor.

---

### Change: `src/ui/devtools/texts/buildTextRegistry.cave.ts`

**Responsibility**

Emit Understanding text blocks from `.cave` module drafts.

**Logic**

- push record blocks for `config.understanding`
- maintain deterministic manifest order

**Interface**

`buildCaveTextBlocks` returns Understanding blocks when authored Understanding exists.

---

### Change: `src/ui/devtools/texts/buildTextRegistry.test.ts`

**Responsibility**

Lock the Understanding text-manifest contract.

**Logic**

- extend the synthetic `.cave` fixture with Understanding
- assert owner type order includes `understanding`
- assert the emitted field labels are `label`, `description`, and effect description labels

**Interface**

Test contract: Understanding text fields are included and only whitelisted fields are included.

---

## 7.5 Cave runtime state and direct state-update path

### Change: `src/data/schemas/game/cave.ts`

**Responsibility**

Persist Cave-owned Understanding in runtime state.

**Logic**

Add:

- `ownedUnderstanding: z.array(z.string()).default([])`

**Interface**

`CaveComponent` gains `ownedUnderstanding: string[]`.

---

### Change: `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

**Responsibility**

Define the payload surface for Understanding-related cave mutation.

**Logic**

Add:

- `ownedUnderstanding?: string[]` to `UpdateCaveCommandPayload`
- new `GainUnderstandingCommandPayload` with:
    - `entityId`
    - `understandingId`

**Interface**

Both direct cave updates and dedicated Understanding gain are typed.

---

### Change: `src/engine/runtime/types/runtimeCommandPayloads.ts`

**Responsibility**

Re-export the new command payload type.

**Logic**

Expose `GainUnderstandingCommandPayload` from the payload barrel.

**Interface**

Top-level runtime-type imports can reference the new payload type.

---

### Change: `src/engine/runtime/types/runtimeCommandTypes.ts`

**Responsibility**

Reserve a distinct runtime command type for Understanding acquisition.

**Logic**

Add:

- `GAIN_UNDERSTANDING = "GAIN_UNDERSTANDING"`

**Interface**

`RuntimeCommandType` now includes `GAIN_UNDERSTANDING`.

---

### Change: `src/engine/runtime/types/runtimeCommandUpdates.ts`

**Responsibility**

Define the typed runtime command alias.

**Logic**

Add:

- `GainUnderstandingCommand = Command<RuntimeCommandType.GAIN_UNDERSTANDING, GainUnderstandingCommandPayload>`

**Interface**

Typed handler and executor code can consume `GainUnderstandingCommand`.

---

### Change: `src/engine/runtime/types/runtimeCommandUnion.ts`

**Responsibility**

Add `GAIN_UNDERSTANDING` to the runtime command union.

**Logic**

Include `GainUnderstandingCommand` in `RuntimeCommand`.

**Interface**

The commands buffer accepts the new command type.

---

### Change: `src/engine/runtime/types.ts`

**Responsibility**

Re-export Understanding command and payload types.

**Logic**

Add barrel exports for:

- `GainUnderstandingCommandPayload`
- `GainUnderstandingCommand`

**Interface**

The rest of the runtime and game layer can import the new types from the existing barrel.

---

### Change: `src/engine/runtime/handlers/UpdateCaveHandler.ts`

**Responsibility**

Support direct replacement of `ownedUnderstanding` for replay and restoration flows.

**Logic**

- add `applyOwnedUnderstanding`, symmetric with `applyOwnedHabiti`
- when `payload.ownedUnderstanding` is present, normalize to sorted unique order and write it to the cave component
- do not change any other `UPDATE_CAVE` semantics

**Interface**

`UPDATE_CAVE` accepts:

- `ownedUnderstanding?: string[]`

No acquisition semantics are added to `UPDATE_CAVE`.

---

### Change: `src/engine/runtime/handlers/UpdateCaveHandler.test.ts`

**Responsibility**

Lock the new direct-update contract.

**Logic**

Add coverage that `ownedUnderstanding` is stored as a sorted unique list.

Existing error-path tests remain unchanged.

**Interface**

Test contract: `UPDATE_CAVE` handles `ownedUnderstanding` exactly like `ownedHabiti`.

---

## 7.6 Dedicated runtime command and handler

### Add: `src/game/handlers/GainUnderstandingHandler.ts`

**Responsibility**

Apply `GAIN_UNDERSTANDING` during the runtime apply phase.

**Logic**

Algorithm:

1. verify command type
2. find target entity by `entityId`
3. verify target has a cave component
4. verify `understandingId` exists in `context.cartridge.config?.understanding`
5. read current `ownedUnderstanding`
6. if already present, return with no mutation and no queued commands
7. otherwise write normalized `ownedUnderstanding`
8. if target is `sys_world`, enqueue hidden bonus state resync using the merged bonus-sync helper

Telemetry rules:

- missing entity: log error
- missing cave component: log error
- unknown authored understanding id: log error

No modal, toast, or UI action is triggered here.

**Interface**

Handler type:

- `RuntimeCommandType.GAIN_UNDERSTANDING`

Accepted command payload:

- `entityId`
- `understandingId`

---

### Change: `src/game/registerGameCommandHandlers.ts`

**Responsibility**

Register the new handler in the game-specific command layer.

**Logic**

- register `GainUnderstandingHandler`

No change to base-engine command registration.

**Interface**

Game runtimes can process `GAIN_UNDERSTANDING`.

---

### Change: `src/engine/runtime/runtimeInvalidationSummary.helpers.ts`

**Responsibility**

No change required.

**Logic**

`entityId` is already in the direct-id invalidation list, so `GAIN_UNDERSTANDING` will already invalidate the target entity correctly.

**Interface**

This file remains unchanged by design.

---

### Add: `src/game/handlers/GainUnderstandingHandler.test.ts`

**Responsibility**

Lock the dedicated acquisition semantics.

**Logic**

Required cases:

- adds a new Understanding id to an existing Cave component
- stores ids as sorted unique list
- logs for missing entity
- logs for missing cave component
- logs for unknown authored id
- duplicate gain is a no-op
- successful gain on `sys_world` enqueues hidden bonus resync when the new Understanding carries bonus-producing effects

**Interface**

Test contract: acquisition semantics are isolated in the dedicated handler.

---

## 7.7 Behavior action, action executor, and text compiler

### Change: `src/data/schemas/behaviorTypes.ts`

**Responsibility**

Add the Understanding behavior-action type.

**Logic**

Add interface:

- `GainUnderstandingAction`
    - `type: "GAIN_UNDERSTANDING"`
    - `understandingId: string`
    - `entityId?: string`

Add it to `BehaviorAction`.

**Interface**

The behavior-action union now includes Understanding gain.

---

### Change: `src/data/schemas/behaviorCoreSchemas.ts`

**Responsibility**

Define the zod schema for the new action.

**Logic**

Add `GainUnderstandingActionSchema` with the exact authored action contract.

**Interface**

The action is schema-valid everywhere `BehaviorActionSchema` is used.

---

### Change: `src/data/schemas/behavior.ts`

**Responsibility**

Thread the new action schema through the behavior-action union.

**Logic**

- import `GainUnderstandingActionSchema`
- include it in `BehaviorActionSchema`
- export the type alongside the other behavior-action exports

**Interface**

`TriggeredActionsAbilitySchema`, draft payloads, and all behavior-bearing authored content accept the new action.

---

### Add: `src/engine/runtime/systems/behavior/actionExecutorGainUnderstanding.ts`

**Responsibility**

Translate the behavior action into the runtime command.

**Logic**

- resolve target entity id using the existing action-executor entity-id utility
- default target to `self` when no explicit `entityId` is provided
- enqueue `GAIN_UNDERSTANDING`

No direct world mutation occurs here.

**Interface**

Input:

- `GainUnderstandingAction`
- `BehaviorContext`
- `CommandBuffer<RuntimeCommand>`

Output:

- enqueued `GAIN_UNDERSTANDING` command

---

### Change: `src/engine/runtime/systems/behavior/ActionExecutor.ts`

**Responsibility**

Route the new behavior action through the normal executor switch.

**Logic**

- import the new executor helper
- add a `case "GAIN_UNDERSTANDING"`

No change to metadata scoping behavior.

**Interface**

All `GAIN_UNDERSTANDING` behavior actions become runtime commands with the same metadata provenance as existing behavior actions.

---

### Change: `src/ui/devtools/editors/behaviors/compiler/constants.ts`

**Responsibility**

Add the new authored verb to the editor/compiler surface.

**Logic**

- add `GAIN_UNDERSTANDING` to `EditorVerb`

**Interface**

The verb becomes part of the behavior-action language contract.

---

### Change: `src/ui/devtools/editors/behaviors/compiler/actionCompiler.parse.ts`

**Responsibility**

Parse the authored action text into the behavior action object.

**Logic**

Add parser support for:

- `GAIN_UNDERSTANDING <understandingId>`
- `GAIN_UNDERSTANDING <understandingId> TO <entityRef>`

Validation rules:

- missing `understandingId` throws a deterministic parse error
- `TO` without a target throws a deterministic parse error

**Interface**

The text compiler returns a valid `GainUnderstandingAction` object.

---

### Change: `src/ui/devtools/editors/draft/options/actionText.ts`

**Responsibility**

Format the new behavior action back into authored text.

**Logic**

- emit the shortest canonical text form
- omit `TO` when `entityId` is absent

**Interface**

Formatting is deterministic and round-trips with the parser.

---

### Change: `src/ui/devtools/editors/draft/options/useActionAutocomplete.ts`

**Responsibility**

Surface the new verb in action autocomplete.

**Logic**

- add `GAIN_UNDERSTANDING` to keyword suggestions

**Interface**

Autocomplete suggests the new action verb.

---

### Change: `src/ui/devtools/editors/behaviors/autocomplete/behaviorStateMachine.constants.ts`

**Responsibility**

Expose the new effect verb in the behavior editor state machine.

**Logic**

- add `GAIN_UNDERSTANDING` to `EFFECT_VERBS`

**Interface**

The editor treats the new action as a legal effect verb.

---

### Change: `src/ui/devtools/editors/behaviors/compiler/actionCompiler.test.ts`

**Responsibility**

Lock parser behavior.

**Logic**

Add cases for:

- parsing `GAIN_UNDERSTANDING foo`
- parsing `GAIN_UNDERSTANDING foo TO sys_world`
- rejecting missing id

**Interface**

Text compiler contract is explicit and stable.

---

### Change: `src/engine/runtime/systems/behavior/ActionExecutor.actions.test.ts`

**Responsibility**

Lock command emission from the action executor.

**Logic**

Add a case asserting that `GAIN_UNDERSTANDING` action produces a `GAIN_UNDERSTANDING` runtime command with standard metadata.

**Interface**

Action-executor translation contract is stable.

---

### Change: `src/engine/runtime/systems/behavior/TriggeredActions.integration.test.ts`

**Responsibility**

Lock end-to-end behavior-rule emission for triggered actions.

**Logic**

Add a case or extend the existing one so a triggered-action rule containing `GAIN_UNDERSTANDING` emits the runtime command with behavior metadata.

**Interface**

`triggeredAction` support for Understanding is integration-tested, not only unit-tested.

---

## 7.8 Merged Cave-owned bonus resolution

### Add: `src/game/habiti/resolveOwnedCaveKnowledgeEffects.ts`

**Responsibility**

Aggregate all Cave-owned authored effects from both registries.

**Logic**

Inputs:

- `ownedHabiti`
- `habitusIndex`
- `ownedUnderstanding`
- `understandingIndex`
- optional unknown-id callbacks for both registries

Outputs:

- merged cave attribute bonuses
- merged absorption XP conversion bonus
- merged resource gain multipliers
- merged producer-output multipliers
- authored definitions actually resolved from both registries

Normalization rules:

- ids are deduplicated and sorted before aggregation
- unknown ids never crash the resolver
- unknown ids invoke the appropriate callback

This resolver becomes the single source of truth for Cave-owned authored bonuses.

**Interface**

Exports one pure function returning the merged bonus object.

No mutation.

---

### Change: `src/game/habiti/resolveEffectiveCaveAttributes.ts`

**Responsibility**

Compute cave attributes from base attributes plus merged authored bonuses.

**Logic**

- switch from Habiti-only resolution to the merged resolver
- add `ownedUnderstanding` and `understandingIndex` inputs

**Interface**

Input contract extends to both registries.

Output contract remains attribute totals.

---

### Change: `src/game/handlers/resolveAbsorptionBonuses.ts`

**Responsibility**

Provide absorption-processing bonuses from both Cave-owned registries.

**Logic**

- read both `ownedHabiti` and `ownedUnderstanding` from `sys_world`
- provide both authored indices from cartridge config
- call the merged bonus resolver

**Interface**

Absorption processing consumes merged Cave-owned authored bonuses.

---

### Change: `src/game/habiti/resourceGainBonusState.ts`

**Responsibility**

List hidden resource-bonus keys based on all authored definitions that can contribute to them.

**Logic**

- extend the resource-enumeration function to include Understanding definitions in addition to Habiti definitions
- keep existing key names unchanged

**Interface**

Existing state-key format is preserved.

The enumerator now accepts both registries.

---

### Change: `src/game/habiti/producerOutputBonusState.ts`

**Responsibility**

List hidden producer-output-bonus keys based on all authored definitions that can contribute to them.

**Logic**

- extend tag enumeration to include Understanding definitions
- keep existing key names unchanged

**Interface**

Existing state-key format is preserved.

The enumerator now accepts both registries.

---

### Change: `src/game/habiti/enqueueResourceGainBonusStateSync.ts`

**Responsibility**

Recompute the hidden world bonus state after direct or command-driven Cave-owned registry changes.

**Logic**

- read both `ownedHabiti` and `ownedUnderstanding`
- accept both authored indices
- use the merged bonus resolver
- enumerate all resource and producer-tag bonus keys from both authored registries
- enqueue `UPDATE_STATE` commands for every enumerated key

This helper remains the only place that writes the hidden resource/producer bonus state.

**Interface**

Input contract extends from Habiti-only to both registries.

State-key naming remains unchanged.

---

### Change: `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.ts`

**Responsibility**

Continue to wrap `UPDATE_CAVE` with hidden bonus-state synchronization.

**Logic**

- after base `UpdateCaveHandler`, trigger hidden bonus resync when either `ownedHabiti` or `ownedUnderstanding` is present in the command payload
- use both authored registries during sync

This preserves existing replay and restoration behavior.

**Interface**

`UPDATE_CAVE` bonus sync now covers both registries.

---

### Change: `src/game/handlers/UpdateCaveWithResourceGainBonusHandler.test.ts`

**Responsibility**

Lock replay and hidden-state sync behavior when Understanding changes are applied through `UPDATE_CAVE`.

**Logic**

Add cases for:

- syncing hidden bonus state after `ownedUnderstanding` update
- skipping sync when neither `ownedHabiti` nor `ownedUnderstanding` is present
- preserving existing error-path behavior

**Interface**

Test contract: direct cave updates resync hidden bonus state for both registries.

---

### Change: `src/game/habiti/resolveResourceGainBonusBreakdown.ts`

**Responsibility**

Explain resource gain contributions from both Cave-owned registries.

**Logic**

- extend inputs to include `ownedUnderstanding` and `understandingIndex`
- contributions remain label/delta/descriptions rows
- contribution ordering remains stable and alphabetical

No second breakdown model is introduced.

**Interface**

Breakdown output remains:

- `totalDelta`
- `contributions`

but now covers both registries.

---

### Change: `src/game/systems/body/worldState.ts`

**Responsibility**

Feed BodySystem cave-attribute resolution from both registries.

**Logic**

- read `ownedUnderstanding` from world cave state
- thread `understandingIndex` into `resolveEffectiveCaveAttributes`

**Interface**

The world-state helper now exposes both Cave-owned registries for attribute resolution.

---

### Change: `src/ui/runtime/world/selection/absorption/resolveAbsorptionPreview.ts`

**Responsibility**

Keep absorption preview truthful when Understanding carries absorption or resource bonuses.

**Logic**

- read `ownedUnderstanding`
- read authored Understanding index from runtime cartridge
- use merged bonus resolution
- pass both registries into resource-gain breakdown

**Interface**

Absorption preview reflects full Cave-owned authored bonuses.

---

### Change: `src/ui/runtime/world/selection/job-card/jobAnalysis.resourceGainRuntime.ts`

**Responsibility**

Keep job-card resource-gain tooltips truthful when Understanding contributes to output.

**Logic**

- read `ownedUnderstanding`
- read authored Understanding index
- pass both into `resolveResourceGainBonusBreakdown`

**Interface**

Resource-gain tooltips reflect merged Cave-owned authored bonuses.

---

### Add or change tests near the above files

**Responsibility**

Lock the merged bonus contract.

**Logic**

Required coverage:

- merged resolver aggregates effects from both registries
- unknown Understanding id is reported without crashing
- attribute totals include Understanding bonuses
- resource-gain breakdown includes Understanding contributions
- absorption preview and job-card tooltip consumers remain correct when only Understanding provides the bonus

**Interface**

Behavior-focused tests only. No DOM logic leaks into engine-level bonus tests.

---

## 7.9 Cave card display

### Add: `src/game/understanding/resolveUnderstandingDisplayEntries.ts`

**Responsibility**

Create Cave-card display entries for Understanding.

**Logic**

This mirrors the existing Habiti display-entry resolver, with these fixed differences:

- `summary` is always empty
- `effectDescriptions` are always derived from authored effects
- `isOwnedByCave` is always computed from `ownedUnderstanding`

It must reuse the existing authored effect-description formatter.

**Interface**

Input:

- `ids`
- `ownedUnderstanding`
- `understandingIndex`

Output shape:

- the same display-entry shape already consumed by `HabitiList`

---

### Change: `src/ui/runtime/world/selection/selectionResolverRuntime.ts`

**Responsibility**

Expose authored Understanding index from the active runtime cartridge.

**Logic**

- add `readUnderstandingIndex(runtime)` parallel to `readHabitiIndex`

**Interface**

Runtime selection resolvers can read `config.understanding` through a single helper.

---

### Change: `src/ui/runtime/world/selection/cave/caveCardTypes.ts`

**Responsibility**

Extend Cave card data with Understanding entries.

**Logic**

Add:

- `understanding: HabitiDisplayEntry[]`

Reusing the existing display-entry shape is intentional; no second list-item type is required.

**Interface**

`CaveCardData` includes an `understanding` field.

---

### Change: `src/ui/runtime/world/selection/cave/resolveCaveCardData.ts`

**Responsibility**

Hydrate the Cave card with Understanding data and merged effect totals.

**Logic**

- read `ownedUnderstanding` from the selected cave entity
- use merged cave-attribute resolution
- resolve Understanding display entries with the authored Understanding index

**Interface**

Cave card data now contains:

- merged attributes
- `habiti`
- `understanding`

---

### Change: `src/ui/runtime/world/selection/cave/CaveCardView.tsx`

**Responsibility**

Render the new Understanding section.

**Logic**

- keep the existing Habiti section unchanged
- add a second `HabitiList` instance below it with:
    - `items = data.understanding`
    - `title = "Understanding"`

No new view-specific business logic is added.

**Interface**

The Cave card visibly renders Understanding when the list is non-empty.

---

## 7.10 Save-load replay and rebirth restoration

### Change: `src/ui/runtime/state/persistenceSlice.ts`

**Responsibility**

Replay direct Cave-owned registries after hydrate so hidden world bonus state is rebuilt.

**Logic**

- after hydrate, read both `ownedHabiti` and `ownedUnderstanding` from `sys_world`
- replay one `UPDATE_CAVE` command carrying both arrays
- flush commands exactly once, as today

**Interface**

Loading a save restores hidden bonus state for both registries.

---

### Change: `src/ui/runtime/state/persistenceSlice.resourceGain.test.ts`

**Responsibility**

Lock the replay contract after hydrate.

**Logic**

- extend the replay assertion to include `ownedUnderstanding`

**Interface**

Test contract: save-load replay restores both Cave-owned registries through `UPDATE_CAVE`.

---

### Change: `src/ui/runtime/terminal/commands/gameRebirthCommand.ts`

**Responsibility**

Carry Understanding through rebirth restoration, alongside existing Cave-owned state.

**Logic**

- when enqueueing `UPDATE_CAVE`, include `ownedUnderstanding: savedCave.ownedUnderstanding`

No other rebirth behavior changes.

**Interface**

Rebirth restores Understanding ownership.

---

### Change: `src/ui/runtime/terminal/commands/gameRebirthCommand.integration.test.ts`

**Responsibility**

Lock rebirth carryover for Understanding.

**Logic**

- extend the saved cave fixture with `ownedUnderstanding`
- assert the reborn `sys_world` cave state includes it

**Interface**

Test contract: rebirth preserves Understanding.

---

## 8. Files intentionally not changed

These files remain unchanged by design:

- `engine/runtime/systems/BehaviorSystem.ts`
    - reason: only `TRIGGER_DRAFT` is special-cased; `GAIN_UNDERSTANDING` is a normal action and belongs in `ActionExecutor`
- `engine/runtime/createGameRuntime.ts`
    - reason: `GAIN_UNDERSTANDING` is game-specific, like other game-layer commands already registered in `registerGameCommandHandlers`
- `ui/runtime/world/selection/components/HabitiList.tsx`
    - reason: it already accepts a custom title and already supports empty summary
- `engine/runtime/runtimeInvalidationSummary.helpers.ts`
    - reason: direct `entityId` invalidation already covers the new command
- runtime serializer/hydrator implementation files
    - reason: serialized entity state already carries cave fields; only replay hooks need updating

---

## 9. Error handling contract

The feature must never fail silently.

### 9.1 `GAIN_UNDERSTANDING`

Errors that must log on the `errors` telemetry channel:

- target entity missing
- target entity lacks a cave component
- authored Understanding id missing from `config.understanding`

### 9.2 Bonus aggregation and display helpers

- unknown authored ids in runtime-owned lists must never throw
- unknown ids must be ignored for aggregation and optionally reported through the existing callback-based error hooks

### 9.3 Editor

- duplicate ids must be rejected deterministically
- empty rename target must be rejected deterministically

---

## 10. Test plan

The test suite must follow the existing project testing standard:

- logic in unit tests
- command/system interactions in integration tests
- view wiring in view tests
- Given / When / Then structure
- no implementation-coupled assertions where behavior assertions suffice

### 10.1 Unit tests

Must exist for:

- Understanding schema defaults and validation surface
- Understanding display-entry resolution
- merged Cave-owned bonus aggregation
- resource-gain breakdown including Understanding
- `GainUnderstandingHandler`
- `ActionExecutor` translation for `GAIN_UNDERSTANDING`
- action compiler parse/format behavior
- route parse/serialize for Understanding

### 10.2 Integration tests

Must exist for:

- `.cave` semantic parse/serialize round-trip including Understanding
- triggered-action pipeline emitting `GAIN_UNDERSTANDING`
- rebirth carryover including `ownedUnderstanding`
- save-load replay restoring both Cave-owned registries through `UPDATE_CAVE`

### 10.3 View tests

Must exist for:

- config-editor route resolution to `UnderstandingEditor`
- Cave card rendering of the Understanding section when entries exist

The view layer must test rendering and wiring only. It must not test business logic calculations.

---

## 11. Acceptance criteria

The feature is complete only when all of the following are true:

1. `.cave` accepts, stores, edits, and serializes `understanding`.
2. System Config shows an `Understanding` card and opens the dedicated editor.
3. Understanding editor supports add, delete, rename, label, description, and effects.
4. `GAIN_UNDERSTANDING` exists as a runtime command and has a dedicated handler.
5. `GAIN_UNDERSTANDING` is legal from `triggeredAction` and the text action compiler.
6. Cave runtime state stores `ownedUnderstanding`.
7. Cave card displays Understanding in its own section.
8. Understanding effects contribute everywhere Habiti effects currently contribute.
9. save-load replay restores Understanding-derived hidden bonus state.
10. rebirth preserves `ownedUnderstanding`.
11. all new and changed tests are green.

---

## 12. Final implementation note

This feature must be implemented as **one consistent extension of the existing Cave-owned authored-effect model**.

It must **not** be implemented as:

- an editor-only registry
- a display-only list
- a command that mutates state but bypasses hidden bonus resync
- a second parallel effect system
- a direct ECS mutation from UI or system code

The codebase already has the correct seams. This design uses them.

