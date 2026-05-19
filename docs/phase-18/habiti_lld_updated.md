# Habiti System LLD

## 1. Purpose

This document defines the low-level design for implementing **Habiti** as a permanent Cave-owned progression system.

This design is constrained by the existing codebase and by the project contracts:
- runtime state lives in ECS and is mutated only through commands/apply
- UI renders semantic state only
- existing editor/session/routing mechanisms must be reused where possible
- unlocks happen through facts, not through a dedicated Habitus effect
- Habiti effects are a separate system from body-local Traits

This document is implementation-binding. The implementation and tests must adhere to it exactly.

---

## 2. Why this design

### 2.1 Habiti are not Traits

The current Trait system is entity-local and runtime-oriented:
- authored in `config.traits`
- referenced by `body.traits`
- processed by `TraitSystem`
- supports modifiers, cycles, expiry, and body-local derived recomputation

Habiti are different in scope and lifecycle:
- carried by Bodies
- permanently owned by Cave after absorption
- deduplicated by owned id
- survive between runs because ownership is stored on Cave and mirrored into permanent facts
- apply Cave/meta bonuses, not body-local ticking behavior

Therefore Habiti must **not** be implemented as another use of `body.traits` or `TraitSystem`.

### 2.2 Existing mechanisms that must be reused

The design must reuse the following existing mechanisms instead of inventing replacements:
- config editor routing/session patterns used by Tutorials and Traits
- `sys_world` fact adjustment flow via `ADJUST_FACT`, `AdjustFactHandler`, and `adjustFact`
- node/screen callout positioning vocabulary from `data/schemas/guidances.ts`
- absorption command pipeline centered on `AbsorbBatchHandler`
- body/cave card rendering seams already used by `useBodyCardData`, `BodyCardContent`, and `CaveCard`

### 2.3 Why Habitus effects are a separate closed list

The agreed Habitus effects are:
- `add_cave_attribute`
- `add_absorption_xp_conversion`
- `add_resource_gain_multiplier`

These are permanent Cave/meta effects. They are not generic path-based runtime modifiers and must be represented as an explicit authored union. This keeps authoring, validation, preview, and application deterministic and easy to test.

---

## 3. Final scope

This implementation includes:
- Habiti definitions in config
- Body identity taxonomy in passport/config
- Body authoring editor entrypoint (`Body Editor`)
- Habiti registry editor
- Habiti rules editor
- body passport identity authoring support required by Habiti constraints
- body runtime storage of carried Habiti
- cave runtime storage of owned Habiti
- Habiti absorption transfer
- permanent fact mirroring for Habiti ownership
- Habiti-derived Cave bonuses
- body card Habiti section
- cave card Habiti section
- swarm row highlight for bodies carrying unowned Habiti
- absorption preview based on real station processing behavior
- runtime node/screen callouts for Habiti/absorption events using existing guidance slot semantics
- automated Habiti gain modal with blocking attention behavior (hide notifications, hide time controls, pause time)

This implementation does **not** include:
- blueprint spawning effects
- Trait system refactors unrelated to Habiti
- generic effect-engine unification
- speculative content systems beyond the agreed editor/data/runtime needs

---

## 4. Authoritative behavior contract

### 4.1 Ownership model

1. Each Body may carry zero or more Habiti.
2. Cave owns a deduplicated permanent set of Habiti.
3. If a Body is processed by an absorption-capable station, all Habiti carried by that Body are transferred to Cave.
4. A Habitus effect applies at most once, because Cave ownership is a set.
5. If Cave already owns a Habitus, absorbing another Body with the same Habitus does not stack its effect.

### 4.2 Transfer gate

1. Habiti transfer is controlled by **station absorption behavior**, not by the incidental presence of XP output.
2. A station that processes bodies but is not flagged as Habiti-absorbing must not transfer Habiti.
3. A station that is flagged as Habiti-absorbing must transfer Habiti for every processed body.

### 4.3 Persistence and facts

1. New Cave-owned Habiti are written onto the Cave component at absorption completion.
2. For every newly gained Habitus id, the runtime must enqueue mirrored fact adjustments so both `run` and `permanent` fact scopes record ownership.
3. Unlocks remain fact-driven and are out of scope of Habitus effects.

### 4.4 UI contract

1. Body card must show carried Habiti in a dedicated section.
2. Cave card must show owned Habiti in a dedicated section.
3. Swarm row must clearly indicate whether the body carries any Habitus not owned by Cave.
4. Absorption preview must show station-specific gains and Habiti deltas from the same resolver used by processing logic.
5. Runtime callouts must be rendered using the existing node/screen slot model, not ad hoc coordinates.
6. When Cave gains one or more new Habiti, the runtime must surface a blocking modal that lists the newly gained Habiti and their details.
7. The Habiti gain modal must use the existing attention semantics: notifications hidden, time controls hidden, and time paused while the modal is active.
8. The modal must be automated by runtime state; it must not depend on authored tutorial definitions.

---

## 5. Data model

## 5.0 New Habiti gain announcement component schema

Add a dedicated runtime component schema for the automated Habiti gain modal.

File: `data/schemas/components/habitiAnnouncement.ts`

Fields:
- `_tag: "habiti_announcement"`
- `active: boolean`
- `current: { habitusIds: string[] } | null`
- `queue: Array<{ habitusIds: string[] }>`
- `attention: ResolvedTutorialAttentionPlan`

Defaults:
- `active = false`
- `current = null`
- `queue = []`
- `attention` defaults to the fixed Habiti modal attention plan defined in section 8.5

Contract:
- `current` represents the one item currently rendered in the blocking modal
- `queue` stores pending modal items in FIFO order
- `habitusIds` are stored as sorted unique arrays
- the component lives on `sys_world`

## 5.1 New Habitus effect schema

Add a dedicated Habitus effect schema.

### Definition
A Habitus effect is a discriminated union with exactly these cases:

#### `add_cave_attribute`
Fields:
- `type`
- `attribute`: one of the existing Cave/body attribute ids (`body`, `mind`, `social`)
- `amount`: number

Semantics:
- adds `amount` to Cave effective attributes
- effects from different owned Habiti stack additively

#### `add_absorption_xp_conversion`
Fields:
- `type`
- `amount`: number

Semantics:
- adds `amount` to the body-to-Cave XP conversion multiplier used by absorption preview and processing
- the implementation must define a single canonical interpretation of `amount`
- the canonical interpretation for this implementation is: **additive multiplier delta**, where base conversion is `1`, and final XP output is `floor(baseXp * (1 + totalDelta))`

#### `add_resource_gain_multiplier`
Fields:
- `type`
- `resource`: string
- `amount`: number

Semantics:
- adds `amount` to the multiplier for station resource output matching `resource`
- the canonical interpretation is additive multiplier delta, where base resource multiplier is `1`, and final output is `floor(baseAmount * (1 + totalDelta))`

### Validation rules
- `amount` must be finite
- `resource` must be non-empty
- effect arrays default to empty

## 5.2 New Habitus definition schema

Add a dedicated Habitus definition schema.

Fields:
- `id: string`
- `label: string`
- `description?: string`
- `type: HabitusTypeId`
- `effects: HabitusEffect[]`
- `excludes: string[]` default `[]`
- identity constraints fields:
  - `allowedSpecies: string[]` default `[]`
  - `allowedGenders: string[]` default `[]`
  - `allowedSocialCategories: string[]` default `[]`
  - `allowedProfessions: string[]` default `[]`

Constraint semantics:
- empty allowed-list means unrestricted for that identity axis
- `excludes` is a list of Habitus ids that cannot coexist on the same Body

## 5.3 New body identity taxonomy schema

Add a dedicated config schema for body identity catalogs.

Fields under a new `config.settings.body` root:
- `species: string[]`
- `genders: string[]`
- `socialCategories: string[]`
- `professions: string[]`

Defaults:
- `genders` must include the current passport values so current behavior remains valid
- all arrays default to empty except `genders`, which defaults to `['male', 'female']`

This taxonomy is authored data used by editors and validation. It is not a replacement for runtime passport storage.

## 5.4 New Habiti rules schema

Add a dedicated ordered rules schema under `config.settings.body.habitiRules`.

Each rule row must contain:
- `id: string`
- `label: string`
- `habitusType: HabitusTypeId`
- `required: boolean`
- `chance: number`
- `maxPicks: number`
- `candidateIds: string[]`

Semantics:
- rules are evaluated in authored order
- `candidateIds` restricts the pool to explicit Habitus ids; empty means all Habiti of `habitusType`
- `required=true` means the generator must attempt to assign at least one valid Habitus if candidates exist
- `maxPicks` limits the number of Habiti contributed by that rule
- final body assignment must still respect identity constraints and exclusions

## 5.5 New Habitus type schema

Add a dedicated enum/string schema for Habitus type.

Supported values for this implementation:
- `species`
- `gender`
- `social_category`
- `profession`
- `sexual_preference`
- `unique_body`

This type is authoring metadata only.

## 5.6 Body runtime schema changes

Change `data/schemas/game/body.ts`:
- extend `PassportSchema` with:
  - `species?: string`
  - `socialCategory?: string`
  - `profession?: string`
- add `habiti: string[]` to `BodyComponentSchema`, default `[]`

Semantics:
- `passport.gender` remains authoritative gender storage
- new passport fields are identity facts used by Habiti generation and display
- `body.habiti` stores carried Habitus ids as a sorted unique array

## 5.7 Cave runtime schema changes

Change `data/schemas/game/cave.ts`:
- add `ownedHabiti: string[]` default `[]`
- add `absorptionXpConversionBonus: number` default `0`
- add `resourceGainMultipliers: Record<string, number>` default `{}` only if a cached derived store is required; otherwise do not persist this field

Contract:
- `ownedHabiti` is canonical persisted ownership
- derived bonuses must be recomputed from `ownedHabiti` and Habitus definitions; they must not become a second source of truth

## 5.8 Config root changes

Change both config schemas:
- `data/schemas/blueprintConfig.ts`
- `data/schemas/v2/config.ts`

Add:
- `habiti: Record<string, HabitusDefinition>`
- `settings.body` containing the body identity catalogs and Habiti rules

The exact placement must be:
- `config.habiti`
- `config.settings.body`

Reason:
- matches existing trait-registry placement for the Habiti registry
- matches existing settings placement for authored ordered collections like tutorials/guidances/conditions

---

## 6. Runtime derived logic

## 6.1 New Cave Habiti derived resolver

Add a dedicated pure resolver in game logic, not in UI.

Responsibility:
- read Cave owned Habiti ids
- read Habitus definitions from config
- resolve the aggregate permanent Habiti bonuses

Output contract:
- `attributeBonuses: { body: number; mind: number; social: number }`
- `absorptionXpConversionBonus: number`
- `resourceGainMultipliers: Record<string, number>`
- `ownedHabiti: HabitusDefinition[]` in stable order for UI consumption if needed by the caller

Rules:
- ignore unknown Habitus ids silently only after logging a loud telemetry error at the integration seam that discovered the bad id
- duplicate ids in `ownedHabiti` must not stack
- definitions are applied in deterministic sorted-owned-id order

## 6.2 Cave attribute application

Cave attributes currently live directly on `cave.attributes`.

Implementation rule:
- do not mutate the authored/base Cave attributes to encode Habiti bonuses
- introduce a derived application seam equivalent in intent to body attribute recomputation
- all UI and processing paths that need effective Cave attributes must consume the derived result, not raw stored attributes alone

This may require adding a `useCaveData` extension and a runtime helper for Cave effective attributes.

## 6.3 Fact mirroring for Habiti ownership

For each newly gained Habitus id, enqueue:
- `run` fact increment
- `permanent` fact increment

Fact type addition required in `data/schemas/conditions.ts`:
- add `habitus_owned`

Fact meaning:
- `factType = 'habitus_owned'`
- `factAbout = <habitus id>`
- value is ownership count; unlock systems should treat `>= 1` as owned

---

## 7. Absorption processing design

## 7.1 New station behavior flag

Habiti transfer must not be inferred from XP output presence.

Add a station state/config flag read by absorption processing:
- `state.processing_absorbs_habiti.value === true`

Contract:
- if absent or false, Habiti are not transferred
- if true, Habiti are transferred for each processed body

## 7.2 Replace fake preview yield logic

Current preview logic in `ui/runtime/world/selection/absorption/absorptionUtils.ts` is heuristic and not authoritative.

This file must be repurposed or replaced so preview uses the same station-aware resolver as runtime processing.

Add a shared pure resolver used by both UI preview and command handling.

### Resolver inputs
- station entity
- processed body component
- current Cave owned Habiti + derived multipliers
- Habitus definitions

### Resolver output for one body
- `xp: number`
- `resources: Array<{ resource: string; amount: number }>`
- `newHabiti: string[]`
- `duplicateHabiti: string[]`

### Batch resolver output for selected bodies
- `bodyCount: number`
- `xp: number`
- `resources: Array<{ resource: string; amount: number }>` aggregated by resource
- `newHabiti: string[]` unique union of newly gained ids across the selection
- `duplicateHabiti: string[]` unique union of already-owned ids carried by selected bodies

Rules:
- preview must assume intra-batch deduplication against Cave plus earlier bodies in the same batch
- `newHabiti` must show only ids that would newly enter Cave ownership after processing the whole selected batch
- duplicate ids inside the batch must not appear multiple times in preview

## 7.3 Output modifier application

When resolving station outputs:
1. compute base output with the existing `resolveOutputAmount`
2. if output resource is `xp`, apply total absorption XP conversion multiplier from owned Habiti
3. if output resource is not `xp`, apply matching resource gain multiplier if one exists
4. floor after multiplier application
5. clamp final output to zero minimum

The existing `ProcessingOutput` schema and `resolveProcessingOutputs` remain the source of station output definitions.

## 7.4 Handler changes

Change `game/handlers/AbsorbBatchHandler.ts`.

New responsibilities:
- gather Cave entity and Habiti-derived bonuses before processing
- pass canonical processing context into the processing function
- collect newly gained Habiti ids returned from processing
- enqueue mirrored fact adjustments for each newly gained Habitus id
- increment existing cave counters unchanged
- emit runtime event payload fields needed by notification/callout resolution

The handler must not directly mutate React/UI state.

## 7.5 Processing changes

Change `game/handlers/absorptionBatchProcessing.ts`.

New responsibilities:
- resolve each processed body's runtime output summary through the shared resolver
- if station absorbs Habiti, transfer new Habiti to Cave owned set
- return aggregated metadata to handler:
  - `processed`
  - `killedEntityIds`
  - `newHabiti`
  - `resourceTotals`
  - `xpTotal`

Ownership update contract:
- `cave.ownedHabiti` must remain sorted unique after processing
- only newly gained ids are returned in `newHabiti`

## 7.6 Output helper changes

Change `game/handlers/absorptionBatchOutputs.ts`.

Keep existing responsibilities:
- station output config parsing
- base amount calculation

Add new responsibilities only if needed for shared output resolution:
- do not duplicate Cave bonus logic here if a shared resolver exists elsewhere
- `resolveOutputAmount` remains the base-value resolver, not the final modified-value resolver

---

## 8. Runtime event and callout design

## 8.1 Event source

Runtime presentation remains hardcoded, but it must be driven by semantic runtime events, not by UI inference.

Add runtime event resolution for these cases:
- Habitus gained by Cave
- bodies absorbed count
- resource total gained from absorption when needed by UI design

## 8.2 Positioning model

Reuse the guidance positioning vocabulary from `data/schemas/guidances.ts`:
- node slots for node-anchored callouts
- screen slots for screen-anchored callouts

Implementation rule:
- do not reuse tutorial definitions themselves
- do reuse the same slot enum semantics and the same layout utility style already used by `resolveGuidanceCalloutLayout`

## 8.3 New runtime callout model

Add a runtime callout model separate from authored guidance definitions.

Required fields:
- unique event id
- aggregation key
- kind
- text
- optional target entity id
- slot
- ttl/expiry timestamps

Kinds required now:
- `habitus_gained`
- `absorption_batch_complete`

Aggregation rules:
- events with the same aggregation key must stack count if emitted within their lifetime
- count-aware text formatting must be deterministic

## 8.4 Rendering seam

Extend the node overlay viewport stack, not the living-card notification stack.

Reason:
- requirement is standard node/screen positioning, not free-position notifications

Change or add runtime overlay files so node/screen runtime callouts render alongside current node overlays and tutorial callouts.

The callout renderer must support:
- node anchored text such as `Habitus gained` or a concrete Habitus label
- node anchored aggregate text such as `5 bodies absorbed`
- optional screen anchored variants if needed later

---


## 8.5 Automated Habiti gain modal

### Responsibility
A newly gained Habitus is progression-significant and must be surfaced with a blocking modal instead of a toast. The modal is runtime-driven, not authored-content-driven.

### Activation contract
1. When an absorption completes with one or more newly gained Habiti, the apply phase must construct one Habiti gain announcement item for that absorption result.
2. One absorption batch produces exactly one modal item, even if multiple Habiti are gained.
3. If no blocking overlay is active on `sys_world`, the item becomes the active Habiti gain modal immediately.
4. If a blocking overlay is already active (`draft`, `thought`, `tutorial`, or another Habiti gain modal), the item is appended to a FIFO queue on `sys_world`.
5. When the active Habiti gain modal is acknowledged, the next queued item becomes active immediately if no other blocking overlay is active; otherwise it remains queued.

### Attention contract
The active Habiti gain modal must use a fixed attention plan with these exact values:
- `hideNotifications = true`
- `hideTimeControls = true`
- `pauseGame = true`
- `focusEntityIds = []`
- `ringEntityIds = []`
- `cameraFocusEntityId = null`
- `blockNonFocusedInteraction = false`

This plan must reuse the existing resolved attention shape already used by tutorials.

### Display contract
The modal must show:
- a stable title indicating new Habiti were gained
- one detail entry per newly gained Habitus in the batch
- each entry's label
- each entry's description when present
- each entry's effect summary derived from the canonical Habitus effect formatter

Ordering must be stable by label, then id.

### Non-goals
- no authored guidance/tutorial definitions
- no notification toast fallback for newly gained Habiti
- no camera focus or entity ring effects
- no direct coupling to tutorial completion facts

## 9. UI design changes

## 9.1 Body card data contract

Change `ui/runtime/world/selection/body/bodyCardTypes.ts` and `useBodyCardData.ts`.

Add fields:
- `habiti: Array<{ id: string; label: string; description: string; isOwnedByCave: boolean }>`

Rules:
- order is stable and deterministic by label, then id
- `isOwnedByCave` compares body-carried Habiti against current Cave owned set
- unknown ids must not crash rendering; they render with id as label only if the definition cannot be resolved

## 9.2 Body card rendering

Change `BodyCardContent.tsx`.

Add a dedicated Habiti section after Traits.

Display contract:
- title: `Habiti`
- render one row/chip per Habitus
- visually distinguish already-owned entries
- do not merge Habiti into the Trait section

## 9.3 Cave card rendering

Change `ui/runtime/world/selection/cave/CaveCard.tsx` and the Cave data hook(s).

Add a dedicated Habiti section.

Display contract:
- title: `Habiti`
- show all owned Habiti with label and description/effect summary where existing UI atoms permit
- list order is stable by label, then id

## 9.4 Swarm row highlight

Change `SwarmRowItem.tsx` and `SwarmCard.styles.ts`.

Add derived flag:
- `hasUnownedHabiti`

Display contract:
- row gets an inner border glow when `hasUnownedHabiti === true`
- row also gets a small explicit marker/icon with tooltip text `Carries unowned Habiti`
- the glow must be the primary scan cue; the marker explains the cue

## 9.5 Absorption preview UI

Change `BodySelector.tsx` and `useBodySelector.ts`.

Replace the current `Expected Yield: X XP` preview with station-aware summary data.

Display contract:
- selected body count
- XP total
- resource totals per resource actually produced by station
- `New Habiti` line when non-empty
- `Already Owned` line when selected bodies carry duplicate/owned Habiti

The preview must be derived solely from the shared batch resolver.

---

## 10. Body editor design

## 10.1 Entry points

Add a new top-level config editor entry: `Body Editor`.

Body Editor contains exactly these authored areas:
- body identity taxonomy editor
- Habiti editor
- Habiti rules editor

## 10.2 Routing changes

Change these files:
- `ui/devtools/editors/file/SystemConfigEditor.tsx`
- `ui/devtools/shell/window-manager/virtualPath.types.ts`
- `ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`
- `ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`
- `ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`

New route/component kind:
- `body`

Card text in `SystemConfigEditor`:
- title: `Body Editor`
- description: `Configure body identity catalogs, Habiti, and Habiti assignment rules.`

## 10.3 Body Editor container

Add `ui/devtools/editors/config/body/BodyEditor.tsx`.

Responsibility:
- render the three sub-editors in one tool frame
- ensure module session exists
- not own data mutation logic beyond composition

Sub-editors:
- `BodyIdentityCatalogEditor`
- `HabitiEditor`
- `HabitiRulesEditor`

## 10.4 Body identity taxonomy editor

Add editor files under `ui/devtools/editors/config/body/identity/`.

Responsibility:
- edit `config.settings.body.species`
- edit `config.settings.body.genders`
- edit `config.settings.body.socialCategories`
- edit `config.settings.body.professions`

Interaction contract:
- add/remove/rename string entries
- reject duplicates with toasts, matching existing editor behavior
- no runtime logic in components; update through session draft mutations only

## 10.5 Habiti editor

Add editor files under `ui/devtools/editors/config/body/habiti/`.

Storage path:
- `config.habiti`

Pattern to reuse:
- registry editing pattern from `TraitsEditor`
- row-form composition pattern from `TraitRowEditor`
- session hook pattern from tutorials/conditions editors when helpful

Habitus row fields:
- id
- label
- description
- type
- effects list
- excludes list
- allowed species list
- allowed genders list
- allowed social categories list
- allowed professions list

Effect editing contract:
- effect type dropdown
- only fields relevant to that effect type are shown
- no freeform generic target/source path editing

## 10.6 Habiti rules editor

Add editor files under `ui/devtools/editors/config/body/rules/`.

Storage path:
- `config.settings.body.habitiRules`

Pattern to reuse:
- ordered-list editing pattern from Tutorials editor

Rule row fields:
- id
- label
- habitus type
- required
- chance
- max picks
- candidate ids

Candidate id source:
- derived from the current `config.habiti` registry
- options filtered by selected `habitusType` when possible

Validation contract:
- duplicate rule ids rejected
- unknown candidate ids rejected by schema validation or row-level normalization before save

## 10.7 Editor file responsibility list

### `ui/devtools/editors/config/body/BodyEditor.tsx`
- container/composition only
- no business logic

### `ui/devtools/editors/config/body/bodyPaths.ts`
- centralize all config path constants used by body-related editors

### `ui/devtools/editors/config/body/useBodyConfigSession.ts`
- shared session read/update helpers for body editor paths
- no rendering

### `ui/devtools/editors/config/body/identity/*`
- taxonomy authoring UI only

### `ui/devtools/editors/config/body/habiti/*`
- Habitus registry authoring UI only

### `ui/devtools/editors/config/body/rules/*`
- Habiti rules authoring UI only

No body-editor component may perform runtime generation or effect application logic.

---

## 11. Body generation contract

This implementation introduces authored data and editor support for Habiti rules. It does not invent a new generation pipeline in this document.

Wherever bodies are instantiated/generated, the generator integration must obey this contract:

1. passport identity fields are assigned first
2. Habiti rules are evaluated in authored order
3. candidate Habiti are filtered by:
   - selected type
   - explicit candidate ids if provided
   - body passport identity constraints
   - already assigned Habiti exclusions
4. assigned `body.habiti` is sorted unique before entity creation completes

If there is no single centralized body-generation seam yet, implementation must stop and identify the real generation entrypoint before coding. No duplicate generation logic may be introduced in UI.

---

## 12. File-by-file implementation plan

## 12.1 Files to add

### Data/schema
- `src/data/schemas/game/habiti.ts`
  - defines Habitus type schema, Habitus effect schema, Habitus definition schema, Habiti rules schema, and related exported types

### Game/runtime logic
- `src/game/habiti/resolveOwnedHabitiEffects.ts`
  - pure resolver for aggregate Cave bonuses from owned Habiti
- `src/game/habiti/resolveHabitiEligibility.ts`
  - pure helper for checking passport identity constraints and exclusions
- `src/game/handlers/resolveAbsorptionHabitiOutcome.ts`
  - shared pure resolver for one-body and batch absorption preview/processing outcome
- `src/game/runtime-events/habitiRuntimeEvents.ts`
  - semantic event mapping for Habiti and absorption callouts
- `src/game/habiti/habitiAnnouncementUtils.ts`
  - pure helpers for building, queueing, and acknowledging Habiti gain announcements
- `src/game/handlers/AcknowledgeHabitiAnnouncementHandler.ts`
  - apply-phase handler for acknowledging and promoting queued Habiti gain modal items

### UI runtime
- `src/ui/runtime/world/selection/components/HabitiList.tsx`
  - reusable Habiti list renderer for body/cave cards
- `src/ui/runtime/habiti/RuntimeHabitiGainModal.tsx`
  - blocking modal renderer for newly gained Habiti
- `src/ui/runtime/habiti/useHabitiGainModalState.ts`
  - hook for reading the active Habiti gain modal and acknowledging it
- `src/ui/runtime/habiti/HabitiGainDisplay.tsx`
  - presentational details list for gained Habiti entries
- `src/ui/runtime/world/node-overlays/runtime-callouts/*`
  - runtime callout model/resolver/render helpers using node/screen slot semantics

### Devtools editors
- `src/ui/devtools/editors/config/body/BodyEditor.tsx`
- `src/ui/devtools/editors/config/body/bodyPaths.ts`
- `src/ui/devtools/editors/config/body/useBodyConfigSession.ts`
- `src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.tsx`
- `src/ui/devtools/editors/config/body/habiti/HabitiEditor.tsx`
- `src/ui/devtools/editors/config/body/habiti/HabitusRowEditor.tsx`
- `src/ui/devtools/editors/config/body/habiti/HabitusEffectsSection.tsx`
- `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`
- `src/ui/devtools/editors/config/body/habiti/HabitusConstraintsSection.tsx`
- `src/ui/devtools/editors/config/body/rules/HabitiRulesEditor.tsx`
- `src/ui/devtools/editors/config/body/rules/HabitiRuleRow.tsx`
- `src/ui/devtools/editors/config/body/bodyEditorDefaults.ts`
- `src/ui/devtools/editors/config/body/bodySessionHelpers.ts`

### Tests/utilities
- colocated `*.test.ts` / `*.test.tsx` for every new logic and editor file that contains behavior
- test utility/factory files only where setup reuse materially improves readability

## 12.2 Files to change

### Schema/config
- `src/data/schemas/blueprintConfig.ts`
- `src/data/schemas/v2/config.ts`
- `src/data/schemas/game/body.ts`
- `src/data/schemas/game/cave.ts`
- `src/data/schemas/components/habitiAnnouncement.ts`
- `src/data/schemas/v2/systemDefaults.ts`
- `src/data/schemas/conditions.ts`
- runtime command type/payload declaration files under `src/engine/runtime/types/*` for Habiti announcement acknowledgement if no suitable existing command exists

### Runtime logic
- `src/game/handlers/AbsorbBatchHandler.ts`
- `src/game/handlers/absorptionBatchOutputs.ts`
- `src/game/handlers/absorptionBatchProcessing.ts`
- `src/game/handlers/AcknowledgeHabitiAnnouncementHandler.ts`
- body generation entrypoint file(s), after code inspection confirms the real seam
- Habiti gain announcement queue/apply helpers

### UI runtime
- `src/ui/runtime/world/selection/body/useBodyCardData.ts`
- `src/ui/runtime/world/selection/body/bodyCardTypes.ts`
- `src/ui/runtime/world/selection/body/BodyCardContent.tsx`
- `src/ui/runtime/world/selection/cave/CaveCard.tsx`
- Cave data hook(s) used by `CaveCard`
- `src/ui/runtime/world/selection/swarm/SwarmRowItem.tsx`
- `src/ui/runtime/world/selection/swarm/SwarmCard.styles.ts`
- `src/ui/runtime/world/selection/absorption/BodySelector.tsx`
- `src/ui/runtime/world/selection/absorption/useBodySelector.ts`
- `src/ui/runtime/world/selection/absorption/absorptionUtils.ts` or replace its responsibilities
- `src/ui/runtime/shell/RuntimeShellCanvas.tsx`
- `src/ui/runtime/notifications/useRuntimeNotificationViewportState.ts`
- `src/ui/runtime/status/RuntimeClock.tsx`
- `src/ui/runtime/tutorials/useTutorialAttentionPlayback.ts` or a replacement hook with merged runtime attention semantics
- `src/engine/runtime/runtimePauseState.ts`
- node overlay viewport/resolver files necessary to render runtime callouts

### Devtools routing
- `src/ui/devtools/editors/file/SystemConfigEditor.tsx`
- `src/ui/devtools/shell/window-manager/virtualPath.types.ts`
- `src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts`
- `src/ui/devtools/shell/window-manager/tabIdToVirtualPath.ts`
- `src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx`

---

## 13. Interfaces and logic by changed file

## 13.1 `data/schemas/game/body.ts`

### Responsibility
Define runtime Body schema and types.

### Changes
- extend `PassportSchema` with the agreed identity fields
- add `habiti` array to `BodyComponentSchema`

### Interface contract
- exported `BodyComponent` includes `habiti: string[]`
- exported `Passport` includes new optional identity fields

### Logic rules
- defaults must preserve existing body parsing
- new arrays default to `[]`

## 13.2 `data/schemas/game/cave.ts`

### Responsibility
Define runtime Cave schema and types.

### Changes
- add `ownedHabiti` array

### Interface contract
- exported `CaveComponent` includes `ownedHabiti: string[]`

### Logic rules
- defaults preserve existing parsing

## 13.3 `data/schemas/conditions.ts`

### Responsibility
Define fact types and authored condition schema.

### Changes
- add `habitus_owned` to `FactTypeSchema`

### Interface contract
- fact threshold conditions may target `habitus_owned`

## 13.4 `game/handlers/AbsorbBatchHandler.ts`

### Responsibility
Handle `ABSORB_BATCH` commands during apply.

### Changes
- resolve Cave-owned Habiti and aggregate bonuses before processing
- pass resolver context into processing
- enqueue mirrored Habitus fact adjustments after processing
- append or activate a Habiti gain modal item when newly gained Habiti are present
- emit payload metadata for runtime events if the event bridge depends on command payload

### Interface contract
Input remains `ABSORB_BATCH` command.
Output side effects remain world mutation + telemetry + command payload enrichment.

### Error handling
- missing station logs loudly and returns, unchanged
- missing cave entity logs loudly and returns without partial ownership mutation

## 13.5 `game/handlers/absorptionBatchProcessing.ts`

### Responsibility
Process assigned bodies for a station.

### Changes
- use shared absorption outcome resolver
- update Cave `ownedHabiti`
- return new aggregate result data

### Interface contract
Return shape becomes:
- `processed`
- `killedEntityIds`
- `newHabiti`
- `xpTotal`
- `resourceTotals`

### Error handling
- unknown body/proxy behaves consistently with current skipping behavior
- unknown Habitus ids discovered in body payload must log loudly and be ignored for effect application

## 13.5A `data/schemas/components/habitiAnnouncement.ts`

### Responsibility
Define runtime schema and defaults for the automated Habiti gain modal state stored on `sys_world`.

### Interface contract
Exports:
- `HabitiAnnouncementComponentSchema`
- `DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT`
- `HabitiAnnouncementComponent`

### Logic rules
- attention defaults must exactly match section 8.5
- `habitusIds` arrays must default to sorted unique empty arrays
- parsing must preserve backward compatibility by allowing `sys_world` to omit the component and then defaulting it in system defaults

## 13.5B `data/schemas/v2/systemDefaults.ts`

### Responsibility
Provide default runtime components for `sys_world`.

### Changes
- add `habitiAnnouncement: DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT` to `DEFAULT_WORLD_ENTITY`

### Logic rules
- default world creation must include the component so selectors and handlers can rely on its presence

## 13.5C `game/habiti/habitiAnnouncementUtils.ts`

### Responsibility
Contain pure queue/state helpers for automated Habiti gain modal behavior.

### Required exports
- `createHabitiAnnouncementItem(habitusIds: string[]): { habitusIds: string[] }`
- `enqueueHabitiAnnouncement(world, habitusIds, blockers): void`
- `acknowledgeHabitiAnnouncement(world, blockers): void`
- `getActiveHabitiAnnouncement(world): HabitiAnnouncementComponent | active item view`

### Logic rules
- one absorption batch becomes one modal item
- ids are normalized to sorted unique arrays
- empty item inputs are ignored
- if blockers exist, append to queue
- if no blockers and no active item exists, promote immediately to active
- acknowledgement removes the active item and promotes the next queued item only when blockers are absent

## 13.5D runtime command type/payload files for Habiti announcement acknowledgement

### Responsibility
Expose the runtime command used by UI to acknowledge the active Habiti gain modal.

### Command contract
Add one dedicated command type:
- `ACKNOWLEDGE_HABITI_ANNOUNCEMENT`

Payload fields:
- none

Logic rules:
- acknowledgement is idempotent when no active Habiti gain modal exists
- the command must only mutate `sys_world.habitiAnnouncement`
- the command must not adjust facts, Cave ownership, or absorption totals

## 13.6 `ui/runtime/world/selection/body/useBodyCardData.ts`

### Responsibility
Assemble semantic body-card view data.

### Changes
- resolve body-carried Habiti against config registry and Cave ownership

### Interface contract
Must return the expanded `BodyCardData` shape

### Logic rules
- no direct UI mutation
- no business logic beyond view-model shaping

## 13.7 `ui/runtime/world/selection/cave/CaveCard.tsx`

### Responsibility
Render Cave selection card.

### Changes
- render Habiti section from Cave-derived data

### Interface contract
Pure render only.

## 13.8 `ui/runtime/world/selection/swarm/SwarmRowItem.tsx`

### Responsibility
Render one swarm row.

### Changes
- derive `hasUnownedHabiti`
- render marker/icon and pass styling flag to row

### Interface contract
Pure render only.

## 13.9 `ui/runtime/world/selection/absorption/useBodySelector.ts`

### Responsibility
Manage selection UI state and preview summary.

### Changes
- replace heuristic yield with shared batch resolver output

### Interface contract
Must expose a semantic preview model, not just scalar XP.

## 13.9A `ui/runtime/habiti/useHabitiGainModalState.ts`

### Responsibility
Read the active Habiti gain modal state from `sys_world` and expose an acknowledge action for UI.

### Interface contract
Returns:
- `activeItem: { habitusIds: string[] } | null`
- `acknowledge: () => void`

### Logic rules
- selector equality must avoid rerender churn by comparing normalized ids
- `acknowledge` must enqueue a dedicated runtime command and flush immediately when runtime is paused

## 13.9B `ui/runtime/habiti/RuntimeHabitiGainModal.tsx`

### Responsibility
Render the automated blocking modal for newly gained Habiti.

### Interface contract
Pure render + command dispatch through `useHabitiGainModalState`.

### Logic rules
- render nothing when no active item exists
- render through existing `Modal`
- include an explicit continue/acknowledge action
- display title plus a detail row for each gained Habitus
- all textual effect summaries must come from the canonical Habitus effect summary resolver already used by body/cave cards

## 13.9C `ui/runtime/notifications/useRuntimeNotificationViewportState.ts`

### Responsibility
Control notification viewport visibility.

### Changes
- hide notifications when either tutorial attention or active Habiti gain modal attention requests it

### Logic rules
- visibility must be derived from a single runtime-attention selector; it must not inspect modal state ad hoc in the component

## 13.9D `ui/runtime/status/RuntimeClock.tsx`

### Responsibility
Render time controls.

### Changes
- hide time controls when either tutorial attention or active Habiti gain modal attention requests it

### Logic rules
- use the same merged runtime-attention selector as notifications

## 13.9E `ui/runtime/tutorials/useTutorialAttentionPlayback.ts` or replacement

### Responsibility
Pause/resume runtime playback in response to active blocking attention.

### Changes
- expand this hook or replace it with a merged runtime-attention playback hook that reads both tutorial attention and active Habiti gain modal attention

### Logic rules
- the hook must own and release pause state exactly as the current tutorial playback hook does
- it must not resume play if the pause was not initiated by the hook itself

## 13.9F `engine/runtime/runtimePauseState.ts`

### Responsibility
Define which runtime overlays are blocking for system-phase purposes.

### Changes
- treat an active Habiti gain modal with `attention.pauseGame === true` as blocking

### Logic rules
- this must participate in the same blocking decision as draft, thought, and tutorial

## 13.9G `ui/runtime/shell/RuntimeShellCanvas.tsx`

### Responsibility
Compose runtime overlay stack.

### Changes
- render `RuntimeHabitiGainModal` in the full chrome stack

### Logic rules
- the modal must live in the runtime shell overlay stack, adjacent to other blocking overlays

## 13.10 `ui/devtools/editors/file/SystemConfigEditor.tsx`

### Responsibility
Expose top-level config editor navigation cards.

### Changes
- add `Body Editor` card

### Interface contract
Opens `body::<filename>` route.

---

## 14. Testing plan

All tests must follow the project testing standards: behavior-focused, readable, Given-When-Then structure, real data where possible, and logic isolated from UI.

## 14.1 Unit tests

### Schema tests
Add tests for:
- Habitus effect parsing for all three effect types
- Habitus definition parsing defaults
- Habiti rules parsing defaults and duplicate/id validation where applicable
- body/cave schema default parsing with new Habiti fields
- condition schema accepting `habitus_owned`

### Logic tests
Add unit tests for:
- `resolveOwnedHabitiEffects`
  - additive attribute aggregation
  - additive XP conversion aggregation
  - resource-specific multiplier aggregation
  - duplicate owned ids do not stack
  - unknown ids are ignored by resolver input contract if filtered upstream
- `resolveHabitiEligibility`
  - allowed-list acceptance
  - allowed-list rejection
  - exclusion rejection
  - empty constraints treated as unrestricted
- shared absorption outcome resolver
  - true absorption station transfers Habiti
  - false/absent flag does not transfer Habiti
  - XP multiplier applied correctly
  - resource multiplier applied only to matching resource
  - batch preview deduplicates new Habiti across selected bodies

## 14.2 Integration tests

### Absorption handler integration
Add tests proving:
- absorbing a body with a new Habitus adds it to Cave owned set
- duplicate Habitus does not stack ownership or effect
- mirrored facts are enqueued/applied for new Habitus only
- XP/resource totals reflect owned Habiti multipliers
- newly gained Habiti create exactly one modal announcement item per absorption batch
- if another blocking overlay is active, the modal item is queued instead of activated
- stations without the absorb-Habiti flag do not transfer Habiti

### Runtime event integration
Add tests proving:
- Habitus gain produces the expected runtime callout event input
- absorption batch aggregate event is count-aware
- runtime callout aggregation keys merge repeated events deterministically

### Body generation integration
Add tests at the real generator seam proving:
- passport identities constrain Habiti assignment
- exclusions are enforced
- authored rule order matters
- final `body.habiti` is sorted unique

If no centralized generation seam exists, this test task is blocked until the seam is identified.

## 14.3 View tests

### Editors
Add smoke/interaction tests for:
- Body Editor card opens correctly
- Habiti editor add/remove/rename
- Habitus effect row switches fields by effect type
- constraints fields persist to draft
- Habiti rules editor add/remove/rename and candidate filtering
- identity taxonomy editor add/remove/rename

### Runtime UI
Add tests for:
- body card renders Habiti section
- cave card renders Habiti section
- swarm row renders unowned-Habiti marker and styling
- body selector summary shows XP/resources/Habiti from shared resolver output
- runtime node callouts render in node/screen overlay stack
- Habiti gain modal renders newly gained Habiti details
- acknowledging the Habiti gain modal enqueues the acknowledge command and closes/promotes correctly
- active Habiti gain modal hides notifications and time controls

---

## 15. Non-negotiable implementation rules

1. No React component may mutate simulation/runtime state directly.
2. No Habiti business logic may live in `.tsx` files.
3. No duplicate preview logic may exist separate from processing logic.
4. No unlock behavior may be embedded in Habitus effects.
5. No reuse of `TraitSystem` as the Habiti ownership pipeline.
6. No speculative editor abstractions beyond the exact body/Habiti scope.
7. All new arrays representing owned/carried Habiti must be stored as sorted unique arrays.
8. All unknown ids or illegal states encountered at runtime must log loudly, never fail silently.
9. All tests must satisfy the documented testing standards.
10. The Habiti gain modal must be driven by runtime component state and runtime commands, never by React-local modal state.

---

## 16. Implementation sequence

1. Add schemas and config roots.
2. Add body/cave runtime storage fields.
3. Add owned-Habiti effect resolver and eligibility helpers.
4. Add absorption shared resolver.
5. Modify absorption handler/processing and fact mirroring.
6. Modify body/cave/swarm/absorption runtime UI to consume the new resolvers.
7. Add runtime callout model and rendering.
8. Add Habiti gain announcement component, command, handler, and modal wiring.
9. Add Body Editor routing and container.
10. Add identity taxonomy editor.
11. Add Habiti editor.
12. Add Habiti rules editor.
13. Integrate the real body-generation seam.
14. Add/finish all tests.

This order is mandatory because it keeps runtime behavior authoritative before UI/editor wiring depends on it.
