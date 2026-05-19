# Habiti Absorption and Display Fixes LLD

## Status

Proposed implementation plan based on direct inspection of the uploaded source tree and the uploaded project contract documents.

This document covers only the fixes required for Habiti absorption preview, Habiti transfer into Cave, XP/resource confirmation, Cave-only effect display, pill-based runtime presentation, and the minimum editor/schema changes required to author the necessary display text.

## Basis

This design is constrained by the project contract and context pack:

- No speculative refactors.
- No new runtime mutation path.
- UI remains render-only.
- Existing command/apply mechanisms remain the only source of runtime mutation.
- Tests remain behavior-focused, colocated, and written against real data/factories where possible.

This document also preserves the prior Habiti identity redesign decisions:

- Habiti remain the canonical source of identity.
- Editor semantics remain session-driven where semantic mutation is required.
- The runtime apply path remains unchanged unless a currently inspected seam is objectively incomplete.

## Why

The current implementation is incomplete in four distinct ways.

### 1. The shipped absorption station is not authored to absorb Habiti

The absorption blueprint defines `processing_outputs` but does not set `processing_absorbs_habiti: true`.

The runtime compiler and handler already support that authored flag. The missing behavior is therefore not a missing system. It is missing authored configuration.

Current consequence:

- the preview may imply Habiti transfer only under test or manually-authored station state
- the shipped absorption station does not transfer body Habiti into Cave at runtime

### 2. The preview and execution paths are not fully aligned

`resolveBatchAbsorptionOutcome` supports `habitusIndex`, but the preview hook does not pass it, while the runtime absorption path does.

Current consequence:

- the preview can diverge from actual absorption when a body carries an unknown Habitus id
- the preview is therefore not authoritative

### 3. The runtime confirmation drops XP and resource results

The absorption handler computes `xpTotal`, `resourceTotals`, and `newHabiti`, and writes them onto the command payload.

The Habiti announcement component only stores `habitusIds`.

Current consequence:

- the post-absorption modal cannot confirm XP or resources even though the runtime already computed them
- the player cannot verify whether XP was awarded

### 4. The Habiti display model is under-authored and semantically wrong

The current display pipeline synthesizes effect text from mechanics and shows effect summaries on both body-carried Habiti and Cave-owned Habiti.

That violates the intended semantics:

- a Habitus effect applies only when Cave owns that Habitus
- bodies may carry Habiti, but body-carried Habiti must not present Cave-only effect text
- the requested UX requires authored RichText display surfaces for description, summary, and effect description lines

Current consequence:

- bodies incorrectly appear to have active Cave effects
- there is no authored summary line
- there are no authored effect description lines
- the runtime display cannot satisfy the requested pill + hover presentation without extending the schema and editor

## Design goals

1. Fix the shipped absorption station so it actually transfers Habiti.
2. Make the preview and execution paths use the same Habiti filtering inputs.
3. Preserve the existing absorption apply path and command flow.
4. Extend the Habiti display contract only as far as required to support the requested authored UX.
5. Ensure effect text is visible only for Cave-owned Habiti presentation.
6. Replace raw-id Habiti summaries with authored label-based pill presentation.
7. Reuse existing utilities, hooks, modal flow, tooltip flow, editor fields, and command payloads where possible.
8. Keep UI components render-only and keep business logic in engine/lib/hooks/util seams.

## Non-goals

1. No change to Habiti mechanics.
2. No change to how owned Cave Habiti effects are computed.
3. No new generic RichText editor framework.
4. No refactor of unrelated body identity, spawning, tutorial, or progression systems.
5. No new runtime event family or modal family.
6. No speculative cleanup of unrelated editor debt.

## Target behavior

### Absorption

When the shipped absorption station processes bodies:

- XP and other configured processing outputs are granted exactly as they are today.
- If `processing_absorbs_habiti` is true, body-carried Habiti are considered for transfer into Cave.
- Only Habiti ids present in the runtime registry are eligible for transfer.
- Cave receives each newly owned Habitus at most once.
- The preview and execution paths use the same eligibility filter inputs.

### Preview

When one or more bodies are selected for absorption:

- the preview shows the total XP to be awarded
- the preview shows the total non-XP resources to be awarded
- the preview shows the Habiti that will be added to Cave using the same Habiti display model as the runtime modal
- the preview never shows raw comma-joined Habitus ids
- the preview does not show Cave-only effect text for body-carried Habiti outside the Cave-target preview context

### Runtime confirmation

When absorption grants one or more new Habiti:

- the existing Habiti modal continues to be the confirmation surface
- the modal shows the new Habiti using pill presentation
- the modal also shows XP and resource totals for that absorption result
- acknowledging the modal continues to use the existing `ACKNOWLEDGE_HABITI_ANNOUNCEMENT` command

### Habiti display semantics

Habiti display has two modes.

#### Body mode

Used for body cards and any other body-carried Habiti display.

Visible in pill:

- `label`

Visible on hover:

- `description`

Never visible in body mode:

- `summary`
- effect description lines

#### Cave mode

Used for Cave-owned Habiti, Habiti gain modal, and absorption preview of Habiti that will be added to Cave.

Visible in pill:

- `label`
- `summary` when non-empty

Visible on hover:

- `description`
- effect description lines, in authored order, when non-empty

### Authored text contract

Each Habitus definition must support these authored display fields:

- `label`: short pill title
- `description`: RichText hover body
- `summary`: RichText Cave-only inline summary

Each Habitus effect entry must support this authored display field:

- `description`: RichText hover line for that specific effect

The runtime must never synthesize player-facing effect prose from mechanics once these authored fields exist.

## Data contract changes

### `HabitusDefinitionSchema`

Keep:

- `id`
- `label`
- `description`
- `type`
- `effects`
- `excludes`

Add:

- `summary: string`

Contract:

- `summary` defaults to `""`
- `summary` is authored display text only
- `summary` does not affect mechanics

### `HabitusEffectSchema`

Keep all current mechanical fields unchanged.

Add to every effect variant:

- `description: string`

Contract:

- `description` defaults to `""`
- `description` is authored display text only
- `description` does not affect mechanics

### `HabitiAnnouncementComponentSchema`

Current queue item contract is too thin.

Replace:

- `{ habitusIds: string[] }`

With:

- `{ habitusIds: string[]; xpTotal: number; resourceTotals: Array<{ resource: string; amount: number }> }`

Contract:

- `habitusIds` remains sorted and deduplicated before storage
- `xpTotal` defaults to `0`
- `resourceTotals` defaults to `[]`
- queue and acknowledge semantics remain unchanged

### `AbsorbBatchCommandPayload`

Formalize the payload fields already written by the handler utility.

Keep:

- `stationId`
- `killedEntityIds?`
- `processedCount?`
- `newHabiti?`

Add:

- `xpTotal?`
- `resourceTotals?`

No runtime behavior changes are introduced by this payload widening. It only removes the current type hole.

## Runtime behavior changes

### Absorption authored flag

The shipped absorption blueprint must explicitly opt into Habiti transfer by setting:

- `processing_absorbs_habiti: true`

No compiler or handler redesign is required because the authored flag already exists in the assignment ability schema and compiler.

### Preview/execution alignment

The preview hook must pass the runtime Habiti registry into `resolveBatchAbsorptionOutcome`.

After this change:

- preview filtering and execution filtering use the same `habitusIndex`
- unknown Habitus ids are excluded consistently in both places

### Announcement payload propagation

When absorption yields one or more new Habiti:

- the existing handler continues to call `enqueueHabitiAnnouncement`
- the enqueue call must include `habitusIds`, `xpTotal`, and `resourceTotals`
- the modal state hook must expose the full queued item rather than only `habitusIds`

### Display entry resolution

The Habiti display resolver must become mode-aware.

New input contract:

- `ids`
- `ownedHabiti?`
- `habitusIndex`
- `mode: "body" | "cave"`

New output contract per item:

- `id`
- `label`
- `description`
- `summary`
- `effectDescriptions`
- `isOwnedByCave`

Mode rules:

- body mode returns `summary = ""` and `effectDescriptions = []`
- cave mode returns authored `summary` and authored effect descriptions
- no synthesized effect prose is returned in either mode

### Display text source of truth

`formatHabitusEffectSummary.ts` must stop being the source of player-facing effect copy.

Required outcome:

- player-facing effect text comes only from authored `effects[].description`
- if no authored effect descriptions exist, no effect text is shown

Implementation constraint:

- this file may be deleted if it becomes unused
- or it may be replaced with a helper that extracts authored description strings only
- it must not remain a mechanic-to-copy formatter

## UI behavior changes

### Habiti list presentation

The runtime Habiti list must change from row-style text output to pill-based presentation.

Each pill shows:

- always: `label`
- only in Cave mode when non-empty: `summary`

Hover content:

- `description`
- effect description lines, only when the resolved display entry includes them

Tooltip rules:

- if `description` and `effectDescriptions` are both empty, the tooltip is omitted
- if any tooltip text exists, it is rendered with the existing RichText runtime component

The pill list must use existing tooltip and theming mechanisms.

### Absorption preview surface

The body selector preview must stop rendering raw joined Habitus ids.

It must instead render:

- selected body count
- XP total
- resource totals
- a Habiti preview section using the same display component family as the modal

The preview remains read-only.

### Runtime Habiti gain modal

The modal must remain the existing modal.

Change only:

- data passed into it
- the display component it renders

It must show:

- XP total
- resource totals
- new Habiti pills

It must keep the existing continue button and existing acknowledge command.

## Editor behavior changes

### Habitus row editor

The Habitus editor must expose the new authored display field:

- `summary`

It must reuse the existing multiline-capable `StringField` rather than introducing a new field framework.

Required editor behavior:

- `description` uses `StringField`
- `summary` uses `StringField` with multiline behavior enabled
- existing type editing and effect editing remain in place

### Habitus effect row editor

Each Habitus effect row must expose the new authored effect display field:

- `description`

It must reuse the existing `StringField`.

The effect row must continue to render the existing mechanical fields for each effect type.

### Editor defaults

Default authoring records must include empty-string values for the new display fields so newly created records are valid immediately.

## File-by-file production changes

### 1. `src/data/raw/example/modules/absorption.bp`

Responsibility:

- define the shipped absorption station blueprint

Change:

- add `processing_absorbs_habiti: true` to `_editor.abilities.assignment`

Interface:

- no schema change
- no runtime compiler change

Logic:

- this authored flag is the gate already read by the compiler and runtime absorption resolver
- without this change, the shipped station does not transfer Habiti

### 2. `src/data/raw/example/modules/core.cave`

Responsibility:

- define the shipped Habiti registry content

Change:

- add `summary` to every authored Habitus definition in the file
- add non-empty `description` to every authored Habitus effect in the file

Interface:

- content must conform to the updated Habiti schema

Logic:

- the shipped example content must exercise the new display contract
- the current `Human` Habitus must describe its Cave summary and its absorption XP conversion effect in authored text rather than relying on synthesized copy

### 3. `src/data/schemas/game/habiti.ts`

Responsibility:

- define the Habiti registry contract

Change:

- add `summary` to `HabitusDefinitionSchema`
- add `description` to every Habitus effect schema variant

Interface:

- `HabitusDefinition` gains `summary: string`
- `HabitusEffect` variants each gain `description: string`
- existing mechanical fields remain unchanged

Logic:

- these are display-only fields
- they do not participate in mechanics, eligibility, or effect resolution

### 4. `src/data/schemas/components/habitiAnnouncement.ts`

Responsibility:

- define the world component that drives the Habiti modal queue

Change:

- widen the queue item schema to include `xpTotal` and `resourceTotals`

Interface:

- `current` and `queue` entries now include:
  - `habitusIds`
  - `xpTotal`
  - `resourceTotals`

Logic:

- queue semantics remain unchanged
- the richer item shape allows the existing modal flow to confirm the full absorption result

### 5. `src/engine/runtime/types/runtimeCommandPayloadsAbsorption.ts`

Responsibility:

- define typed absorption command payloads

Change:

- add `xpTotal?`
- add `resourceTotals?`

Interface:

- `AbsorbBatchCommandPayload` formally matches the fields already written by the absorption command metadata utility

Logic:

- no behavior change
- removes current unsound cast-based payload extension

### 6. `src/game/handlers/AbsorbBatchHandler.ts`

Responsibility:

- orchestrate batch absorption command handling

Change:

- keep the current processing path
- change the Habiti announcement enqueue call to pass the richer announcement item

Interface:

- public handler interface remains unchanged

Logic:

- if `newHabiti.length === 0`, do not enqueue a Habiti announcement
- if `newHabiti.length > 0`, enqueue:
  - `habitusIds: newHabiti`
  - `xpTotal`
  - `resourceTotals`

### 7. `src/game/handlers/absorptionBatchCommandMetadata.ts`

Responsibility:

- mirror absorption results onto the command payload and mirrored facts

Change:

- no logic redesign
- update any local payload typing to match the formal widened command payload contract

Interface:

- exported function signature remains unchanged

Logic:

- this file already writes `xpTotal` and `resourceTotals`
- after the payload type is widened, it must no longer rely on an ad hoc hidden extension

### 8. `src/game/habiti/habitiAnnouncementUtils.ts`

Responsibility:

- enqueue and acknowledge Habiti announcement items on the world component

Change:

- change `enqueueHabitiAnnouncement` to accept one rich item instead of only `habitusIds`

Interface:

- `enqueueHabitiAnnouncement(world, item)` where `item` contains:
  - `habitusIds`
  - `xpTotal`
  - `resourceTotals`
- `acknowledgeHabitiAnnouncement(world)` remains unchanged

Logic:

- sort and deduplicate only `habitusIds`
- preserve `xpTotal` and `resourceTotals` exactly as passed
- keep existing overlay-blocking queue behavior

### 9. `src/game/habiti/resolveHabitiDisplayEntries.ts`

Responsibility:

- derive runtime-ready Habiti display entries from registry data

Change:

- add explicit display mode
- stop returning synthesized `effectSummary`
- return authored `summary` and authored `effectDescriptions`

Interface:

- input becomes:
  - `ids`
  - `ownedHabiti?`
  - `habitusIndex`
  - `mode`
- output item becomes:
  - `id`
  - `label`
  - `description`
  - `summary`
  - `effectDescriptions`
  - `isOwnedByCave`

Logic:

- unknown ids still fall back to `label = id`
- unknown ids produce empty authored text fields
- body mode suppresses Cave-only text
- cave mode exposes authored summary and authored effect descriptions
- sorting remains stable by label then id

### 10. `src/game/habiti/formatHabitusEffectSummary.ts`

Responsibility:

- currently synthesizes display text from mechanical effects

Change:

- remove mechanic-to-copy behavior

Interface:

- either delete this file or replace its export with a helper that extracts authored `description` strings from Habitus effects

Logic:

- this file must no longer generate player-facing prose from mechanics
- the runtime display source of truth must be authored text only

### 11. `src/ui/runtime/world/selection/body/useBodyCardData.ts`

Responsibility:

- prepare body card data for rendering

Change:

- call `resolveHabitiDisplayEntries` with `mode: "body"`

Interface:

- returned `habiti` entries use the new display entry shape

Logic:

- body cards continue to show the body's carried Habiti
- effect descriptions and summary are intentionally suppressed by the resolver in this mode

### 12. `src/ui/runtime/world/selection/cave/useCaveData.ts`

Responsibility:

- prepare Cave card data for rendering

Change:

- call `resolveHabitiDisplayEntries` with `mode: "cave"`

Interface:

- returned `habiti` entries use the new display entry shape

Logic:

- Cave cards must surface authored summary and authored effect description lines because these Habiti are owned by Cave

### 13. `src/ui/runtime/world/selection/absorption/useBodySelector.ts`

Responsibility:

- own the body selector view-model and preview state

Change:

- pass `habitusIndex` into `resolveBatchAbsorptionOutcome`
- derive preview Habiti display entries using the Cave display mode

Interface:

- keep existing exported hook signature
- expand returned preview shape to include resolved preview display entries needed by the TSX layer

Logic:

- preview uses the same registry and same owned-Habiti inputs as runtime execution
- preview Habiti represent what Cave will gain, so they use Cave display mode
- the hook owns the derivation; the TSX layer only renders

### 14. `src/ui/runtime/world/selection/absorption/BodySelector.tsx`

Responsibility:

- render the body selection UI and preview

Change:

- replace raw joined `newHabiti` and `duplicateHabiti` strings with a structured preview section
- render XP and resources exactly as before
- reuse the shared Habiti display component family for Habiti preview content

Interface:

- public component props remain unchanged

Logic:

- this component remains render-only
- no absorption business logic moves into TSX

### 15. `src/ui/runtime/world/selection/absorption/BodySelector.styles.ts`

Responsibility:

- style the body selector layout

Change:

- adjust preview layout to support a stacked preview block and pill wrapping

Interface:

- existing exported styled components may be extended or replaced as needed by the new preview structure

Logic:

- styling must continue to use the existing theme and Emotion conventions

### 16. `src/ui/runtime/world/selection/components/HabitiList.tsx`

Responsibility:

- render Habiti display entries in runtime selection surfaces

Change:

- replace row-style text presentation with pill presentation
- support inline Cave summary and tooltip content

Interface:

- keep props:
  - `items`
  - `title?`
- consume the new display entry shape

Logic:

- each item renders as one pill
- the pill always shows `label`
- the pill shows `summary` only when non-empty
- tooltip content is built only from the resolved display entry text fields
- no business logic or text synthesis occurs in the component

### 17. `src/ui/runtime/habiti/HabitiGainDisplay.tsx`

Responsibility:

- render the content shown inside the runtime Habiti gain modal and reusable Habiti preview blocks

Change:

- widen the component to render XP totals, resource totals, and Habiti pills

Interface:

- input props become:
  - `items`
  - `xpTotal`
  - `resourceTotals`

Logic:

- the component remains purely presentational
- it renders totals first, then the Habiti list
- it reuses `HabitiList` for Habiti rendering rather than duplicating pill logic

### 18. `src/ui/runtime/habiti/useHabitiGainModalState.ts`

Responsibility:

- select the active Habiti announcement item and expose acknowledge behavior

Change:

- select the full rich announcement item instead of only `habitusIds`

Interface:

- `activeItem` becomes either `null` or the full queue item shape
- `acknowledge` remains unchanged

Logic:

- selector equality must compare the full queue item shape deterministically
- the hook continues to own only state selection and command dispatch wiring

### 19. `src/ui/runtime/habiti/RuntimeHabitiGainModal.tsx`

Responsibility:

- render the Habiti gain modal

Change:

- resolve Habiti display entries using `mode: "cave"`
- pass `xpTotal` and `resourceTotals` to `HabitiGainDisplay`

Interface:

- exported component remains unchanged

Logic:

- the modal continues to open only when there is an active announcement item
- it continues to use the existing continue button and acknowledge command

### 20. `src/ui/devtools/editors/config/body/habiti/HabitusRowEditor.tsx`

Responsibility:

- render one Habitus definition editor row

Change:

- replace `SimpleStringField` with `StringField` for `description`
- add `StringField` for `summary`

Interface:

- public component props remain unchanged

Logic:

- `summary` is authored display text only
- multiline editing uses the existing `StringField` behavior rather than a new editor abstraction
- type changes continue to flow through the existing session action

### 21. `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`

Responsibility:

- render one authored effect row for a Habitus

Change:

- add `StringField` for `${path}.description`

Interface:

- public component props remain unchanged

Logic:

- the effect `description` field is display-only authoring data
- all existing mechanical controls remain intact

### 22. `src/ui/devtools/editors/config/body/bodyEditorDefaults.ts`

Responsibility:

- create valid default authoring records for the body editor

Change:

- add `summary: ""` to `createDefaultHabitus`
- ensure default Habitus definitions continue to include `description`
- add `description: ""` to the default shape used when creating a new effect row

Interface:

- existing factory exports remain

Logic:

- newly created records must satisfy the updated schema immediately without requiring manual cleanup

### 23. `src/ui/devtools/editors/fields/string-field/StringField.tsx`

Responsibility:

- provide the existing multiline-capable string editor field

Change:

- no logic change required

Interface:

- unchanged

Logic:

- this file is intentionally reused as-is for Habitus `description`, Habitus `summary`, and effect `description`

## Files intentionally unchanged

### `src/data/schemas/abilities/assignment.ts`

Reason:

- the authored `processing_absorbs_habiti` field already exists
- no schema redesign is required

### `src/engine/compiler/abilities/assignmentCompiler.ts`

Reason:

- the compiler already writes `state.processing_absorbs_habiti`
- the missing behavior is authored data, not missing compiler support

### `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`

Reason:

- the outcome resolver already supports `habitusIndex`
- the incomplete seam is the preview caller not passing that input

### `src/game/handlers/absorptionBatchProcessing.ts`

Reason:

- this file already updates `sys_world.cave.ownedHabiti`
- no mechanic change is required

### `src/game/habiti/resolveOwnedHabitiEffects.ts`

Reason:

- Cave-owned Habiti effects are already computed from Cave ownership only

### `src/game/habiti/resolveEffectiveCaveAttributes.ts`

Reason:

- Cave attribute bonuses are already resolved from owned Cave Habiti only

### `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

Reason:

- it only depends on `isOwnedByCave`, which remains part of the resolved display entry contract

## Test plan

All tests must adhere to the project testing standard:

- behavior-focused
- Given/When/Then structure
- real data and factories where possible
- UI tests restricted to rendering and wiring
- no complex business logic assertions inside TSX tests

### 1. `src/game/handlers/resolveAbsorptionHabitiOutcome.test.ts` (new)

Add.

Prove:

- when `processing_absorbs_habiti` is false, no Habiti are returned
- when `processing_absorbs_habiti` is true and `habitusIndex` is supplied, unknown Habiti ids are excluded
- batch preview uses the same eligibility result as single-body resolution
- duplicate Cave-owned Habiti are reported separately from newly gained Habiti

### 2. `src/game/handlers/AbsorbBatchHandler.processingResult.test.ts` (change)

Change.

Prove:

- `sys_world.cave.ownedHabiti` contains the newly gained Habitus after handling
- the command payload still contains `xpTotal`, `resourceTotals`, and `newHabiti`
- the Habiti announcement current item contains:
  - `habitusIds`
  - `xpTotal`
  - `resourceTotals`
- mirrored fact adjustments remain limited to newly gained Habiti

### 3. `src/game/habiti/habitiAnnouncementUtils.test.ts` (change)

Change.

Prove:

- enqueue preserves `xpTotal` and `resourceTotals`
- blocking overlays still queue the rich item rather than activating it
- acknowledge remains idempotent and preserves queued rich items correctly

### 4. `src/game/habiti/resolveHabitiDisplayEntries.test.ts` (new)

Add.

Prove:

- body mode returns label and description but suppresses summary and effect descriptions
- cave mode returns summary and authored effect descriptions
- unknown Habiti ids do not crash and fall back to the id label
- `isOwnedByCave` remains correct

### 5. `src/ui/runtime/world/selection/absorption/BodySelector.test.tsx` (change)

Change.

Prove:

- preview still shows selected count, XP, and resource totals
- preview uses displayed Habitus labels rather than raw joined ids
- preview reflects Habiti transfer only when the station state enables `processing_absorbs_habiti`
- preview uses the runtime Habiti registry for filtering

### 6. `src/ui/runtime/world/selection/components/HabitiList.test.tsx` (new)

Add.

Prove:

- items render as pills
- body-mode entries show label only in the pill
- cave-mode entries show summary in the pill when present
- tooltip content shows description and effect descriptions when present
- tooltip content is omitted when no hover text exists

### 7. `src/ui/runtime/habiti/RuntimeHabitiGainModal.test.tsx` (new)

Add.

Prove:

- the modal opens from the richer Habiti announcement item
- the modal shows XP total and resource totals
- the modal shows Habiti pills resolved in Cave mode
- clicking Continue enqueues `ACKNOWLEDGE_HABITI_ANNOUNCEMENT`

### 8. `src/ui/devtools/editors/config/body/habiti/HabitusRowEditor.test.tsx` (new or change if already present)

Add or change.

Prove:

- the row renders `description` using `StringField`
- the row renders `summary`
- editing `summary` writes to `${basePath}.summary`
- existing type change wiring remains intact

### 9. `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.test.tsx` (new or change if already present)

Add or change.

Prove:

- the row renders the new `description` field
- editing it writes to `${path}.description`
- existing mechanical fields still render per effect type

## Acceptance criteria

The implementation is complete only when all of the following are true:

1. The shipped absorption station is authored with `processing_absorbs_habiti: true`.
2. Absorption preview and execution both use `habitusIndex` when resolving eligible Habiti.
3. Cave-owned Habiti are actually added to `sys_world.cave.ownedHabiti` during absorption of eligible bodies.
4. The runtime Habiti modal confirms XP and resource totals in addition to new Habiti.
5. Body-carried Habiti never show Cave-only effect text.
6. Cave-owned Habiti show authored summary and authored effect description lines.
7. Runtime Habiti display uses pills and RichText hover content.
8. Player-facing effect prose is authored, not synthesized from mechanics.
9. The editor exposes `summary` and effect `description` authoring using existing string field infrastructure.
10. All changed and new tests pass under the project testing standard.

## Detritus removal checklist

The implementation is not complete unless all of the following are true:

1. No runtime surface shows raw comma-joined Habitus ids where a display entry is available.
2. No body card surface shows authored effect descriptions.
3. No player-facing runtime surface relies on `formatHabitusEffectSummary` to generate prose from mechanics.
4. No Habiti announcement item drops XP or resource totals once they have been computed by absorption.
5. No new runtime mutation path is introduced.
6. No new generic editor framework is introduced.
7. No UI component takes on new business logic that belongs in a hook, helper, or runtime utility.
