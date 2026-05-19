# Habiti Delta LLD - Revision 2

## 1. Purpose

This document updates the prior Habiti delta LLD after review of the revised source archive.

It does two things:
1. narrows the delta to the gaps that still exist in the current implementation
2. adds the newly requested behavior changes for runtime attention, light suppression, tutorial self/callout fidelity, and editor SmartTooltip coverage

This document is implementation-binding.
The implementation and tests must adhere to it exactly.

It is constrained by the project contracts already in force:
- ECS world remains the single source of truth
- all runtime mutation flows through commands and apply
- React renders semantic state only
- existing editor, routing, tutorial, attention, and overlay mechanisms must be reused where possible
- no speculative abstractions may be introduced

---

## 2. Basis for this revision

The revised source already implements part of the earlier delta.
Those implemented parts must be removed from the remaining delta so the plan stays exact.

The following items are now considered already landed and are therefore no longer part of the remaining Habiti delta:
- top-level Body Editor routing and window-manager integration
- runtime shell rendering of the Habiti gain modal
- merged runtime-attention consumption for notification visibility and time-control visibility
- shared absorption preview consumption in `useBodySelector`

The remaining delta is therefore limited to the unresolved contract gaps listed below.

---

## 3. Why this revision is needed

### 3.1 The remaining gaps are no longer broad feature gaps

The current branch is no longer missing the entire feature surface.
It is missing a smaller set of contract-level fixes:
- one remaining illegal runtime mutation path for `body.habiti`
- incomplete identity/config integration
- incomplete absorption result and modal queue semantics
- incomplete editor validation and standards compliance
- missing runtime-attention rendering rules for selection and light suppression
- incorrect propagation of tutorial self semantics into attention and callout targeting

### 3.2 The new requested runtime-attention behavior must be specified explicitly

The current runtime-attention implementation already hides notifications and time controls and pauses correctly for blocking overlays, but it does not yet define the visual-rendering behavior you requested:
- selected entities must not render attention rings
- entities outside the active attention focus must not emit LightModule light
- tutorial self must remain authoritative for self-directed attention and callout behavior

These are rendering/runtime-projection rules, not authored-content rules.
They must therefore be implemented by extending the existing runtime-attention and display seams, not by adding new authored schema.

### 3.3 Editor SmartTooltip coverage is a standards requirement, not an enhancement

In this codebase, interactable editor controls are expected to explain themselves through `SmartTooltip`.
The current Body editor files do not yet meet that standard.
This is a standards-compliance issue and must be treated as required work, not optional polish.

---

## 4. Authoritative delta contract

## 4.1 Runtime mutation contract for `body.habiti`

1. `body.habiti` must never be written by mutating a body component directly during system/read logic.
2. Any runtime write to `body.habiti` must flow through the existing body update command/apply path.
3. The canonical body update payload must therefore support `habiti`.
4. Any helper that derives body updates from body state must preserve and emit `habiti` when it changes.
5. The existing direct write path is forbidden after this revision.

## 4.2 Body identity and Habiti generation contract

1. The canonical authored root for body settings remains `config.settings.body`.
2. The config schema must not keep a competing root-level `config.body` contract.
3. `PassportSchema` must support the authored identity taxonomy without preserving a hard-coded two-value runtime contract for gender.
4. The runtime/backfill identity normalization path must preserve all authored passport axes required by Habiti constraints:
   - `gender`
   - `species`
   - `socialCategory`
   - `profession`
5. Habiti assignment must continue to reuse the existing assignment seam.
6. When a Habiti rule provides non-empty `candidateIds`, the candidate set must still be constrained by the rule's `habitusType`.
7. No UI component may perform generation or assignment logic.

## 4.3 Absorption processing completeness contract

1. The absorption processing layer must return all data required by the LLD and by the UI:
   - `processed`
   - `killedEntityIds`
   - `newHabiti`
   - `xpTotal`
   - `resourceTotals`
2. `AbsorbBatchHandler` must consume that full result shape.
3. If `sys_world` cannot be resolved, the handler must log loudly and return without partial Habiti/modal side effects.
4. If Cave cannot be resolved, the handler must log loudly and return without partial Habiti ownership mutation.
5. The preview and processing paths must continue to share one authoritative absorption-outcome resolver.
6. The absorption preview UI must show both:
   - `New Habiti`
   - `Already Owned`
   when the corresponding sets are non-empty.

## 4.4 Habiti gain modal acknowledgement and queue contract

1. `ACKNOWLEDGE_HABITI_ANNOUNCEMENT` remains a dedicated command.
2. Its payload must contain no fields.
3. The command must be idempotent when no active Habiti announcement exists.
4. The acknowledge handler must not compare request payload ids to runtime state.
5. The acknowledge handler must mutate only the Habiti announcement component on `sys_world`.
6. Queue promotion after acknowledgement must be blocker-aware:
   - if another blocking overlay is active after acknowledgement, the next queued item remains queued
   - if no blocking overlay is active after acknowledgement, the next queued item becomes active immediately
7. The queue helper layer must own this promotion rule centrally.

## 4.5 Body editor standards contract

1. Every interactable control in the Body editor must be covered by a `SmartTooltip`.
2. "Interactable" includes:
   - text inputs
   - number inputs
   - enum/select controls
   - boolean controls
   - add buttons
   - remove/delete buttons
   - row headers/titles when they are clickable or expandable
3. Tooltip text must explain the user-facing purpose of the control, not implementation details.
4. Tooltip coverage must be explicit in the component tree; missing tooltip coverage is a defect.
5. `HabitusEffectRow` must render only the fields relevant to the currently selected effect type.
6. `HabitiRuleRow` must not use a freeform comma-separated candidate-id field.
7. Candidate-id editing must be derived from the current Habiti registry and filtered by selected `habitusType` when possible.
8. Rule validation must reject:
   - duplicate rule ids
   - unknown candidate ids
   - candidate ids whose Habitus type is incompatible with the rule's `habitusType`
9. No Body editor component may contain Habiti business logic beyond draft-shaping, validation, and view wiring.

## 4.6 Selection suppresses attention rings

1. If an entity is currently selected, its attention rings must not render.
2. This suppression applies even when the entity id is present in the active runtime-attention `ringEntityIds`.
3. Selection suppresses ring rendering only.
4. Selection must not mutate the underlying attention plan or the stored `ringEntityIds`.
5. When the entity is no longer selected, normal ring rendering may resume immediately if runtime attention still requests it.

## 4.7 Defocus suppresses LightModule emission

1. If an entity is currently defocused by active runtime attention, its `LightModule` must not emit visible light.
2. "Defocused by active runtime attention" means all of the following are true:
   - a runtime attention plan is active
   - that plan has one or more focused entity ids
   - the entity is not in the focused set
   - the entity is currently being deemphasized/treated as outside the active attention focus
3. Light suppression is a transient rendering effect only.
4. Light suppression must not mutate authored light config or persistent runtime component data.
5. When defocus ends, normal light behavior must resume from the existing authored/runtime light state.
6. Sprite visibility, selection state, and other non-light visual state must remain controlled by their existing systems.

## 4.8 Tutorial self and callout fidelity contract

1. The resolved tutorial `selfId` must remain authoritative throughout tutorial runtime projection.
2. Self-directed tutorial attention semantics must use the resolved `selfId`, not the resolved guidance binding target.
3. Specifically, the mechanisms named `hide_all_but_self` and `show_attention_effect_on_self` must operate on tutorial `selfId`.
4. Runtime guidance/callout projection must preserve tutorial self separately from guidance target.
5. A node callout that is intended to follow tutorial self must anchor to the resolved `selfId`, not to `sys_world` and not to an unrelated binding target.
6. If tutorial self cannot be resolved for a self-directed callout or attention effect, the system must log loudly and suppress that self-directed projection instead of silently falling back to `sys_world`.
7. Existing selection and deselection targeting behavior remains unchanged.
8. This revision does not add new authored tutorial schema. It repairs propagation and interpretation of the existing tutorial self semantics.

---

## 5. Files to add

Only add files where the existing codebase has no suitable seam.

### 5.1 `src/ui/devtools/editors/fields/string-array-field/AutocompleteStringArrayField.tsx`

#### Responsibility
Provide a reusable array editor for string ids using existing field styling and `SmartTooltip`, while constraining input to a known suggestion set.

#### Why it is needed
The current field toolkit has `StringArrayField` and `AutocompleteStringField`, but it does not have an array editor that can enforce registry-derived candidate selection.
The Body rules editor requires that capability.

#### Interface contract
Props must include:
- `label`
- `filename`
- `path`
- `suggestions: string[]`
- `tooltip`

Optional props may include a validation callback or empty-state helper text only if required by the existing field patterns.

#### Logic rules
- stores arrays in draft state
- trims whitespace
- removes empty values
- preserves stable order of entered values unless an explicit normalization step is required upstream
- surfaces only allowed suggestions in its completion UI
- must not perform Habiti business logic

#### Non-goals
- no generic multi-select abstraction outside the current editor need
- no runtime-state mutation

---

## 6. Files to change

## 6.1 `src/engine/runtime/types/runtimeCommandPayloadsUpdate.ts`

### Responsibility
Define canonical update payload shapes for apply-phase body mutation.

### Changes
- extend `BodyUpdatePayload` to support `habiti`

### Interface contract
`BodyUpdatePayload` must allow `habiti?: string[]`.

### Logic rules
- payload remains partial/update-oriented
- no other payload semantics change in this revision

## 6.2 `src/game/systems/body/updatePayload.ts`

### Responsibility
Convert body state into canonical update payloads.

### Changes
- include `habiti` in the payload mapping when body state includes it

### Interface contract
The payload emitted for a body with changed Habiti must include the normalized `habiti` array.

### Logic rules
- preserve existing mapping behavior for all other body fields
- no direct runtime mutation

## 6.3 `src/game/systems/body/resolveBodyIdentityTickState.ts`

### Responsibility
Resolve identity-derived body tick state.

### Changes
- remove the direct assignment path for `input.body.habiti`
- route Habiti writes through the existing update-payload/apply flow

### Logic rules
- may still derive the target Habiti set
- must not directly mutate body state outside the apply pathway

## 6.4 `src/data/schemas/v2/config.ts`

### Responsibility
Define the canonical v2 config root.

### Changes
- remove the competing root-level body-settings contract
- preserve `config.settings.body` as the only canonical body-settings root

### Interface contract
Any consumer reading body settings must do so from `config.settings.body`.

### Logic rules
- parsing/defaults must remain backward compatible only insofar as existing migration behavior explicitly supports it
- no new competing config roots may be introduced

## 6.5 `src/data/schemas/game/body.ts`

### Responsibility
Define runtime Body schema and passport identity fields.

### Changes
- preserve `habiti`
- ensure the runtime passport contract can represent authored body identity taxonomy without a hard-coded two-value gender enum

### Interface contract
`Passport` must continue to include:
- `gender`
- `species`
- `socialCategory`
- `profession`

### Logic rules
- defaults remain compatible with current runtime parsing
- no body data outside this scope changes in this revision

## 6.6 `src/game/systems/body/identityBackfill.ts`

### Responsibility
Normalize and backfill runtime passport/body identity state.

### Changes
- preserve all Habiti-relevant passport axes during normalization and backfill

### Interface contract
Backfilled passport data must retain:
- `gender`
- `species`
- `socialCategory`
- `profession`

### Logic rules
- normalization must not silently drop any of the above fields
- unknown values may still be normalized according to existing schema rules, but omission is forbidden

## 6.7 `src/game/habiti/assignBodyHabiti.ts`

### Responsibility
Assign Habiti to bodies from authored rules.

### Changes
- enforce `habitusType` filtering even when `candidateIds` is non-empty

### Interface contract
Candidate selection must satisfy all of the following simultaneously:
- rule type match
- explicit candidate-id inclusion when present
- identity constraints
- exclusion constraints

### Logic rules
- no duplicate assignment
- output remains sorted unique
- authored rule order remains authoritative

## 6.8 `src/game/handlers/absorptionBatchProcessing.ts`

### Responsibility
Process assigned bodies for an absorption-capable station.

### Changes
- return `xpTotal`
- return `resourceTotals`
- preserve current `processed`, `killedEntityIds`, and `newHabiti`

### Interface contract
Return shape must be exactly:
- `processed`
- `killedEntityIds`
- `newHabiti`
- `xpTotal`
- `resourceTotals`

### Logic rules
- continue to use the shared absorption outcome resolver
- continue to keep `cave.ownedHabiti` sorted unique
- unknown Habitus ids must log loudly and be ignored for effect application

## 6.9 `src/game/handlers/AbsorbBatchHandler.ts`

### Responsibility
Handle `ABSORB_BATCH` during apply.

### Changes
- consume the expanded processing result
- hard-return on missing `sys_world`
- hard-return on missing Cave
- preserve mirrored fact enqueueing and Habiti gain modal enqueueing only after required world entities are available

### Interface contract
Input command remains unchanged.
Output remains apply-phase world mutation plus any existing telemetry/event bridge behavior.

### Logic rules
- no partial Habiti ownership mutation on missing prerequisites
- no partial modal enqueueing on missing prerequisites

## 6.10 `src/game/habiti/habitiAnnouncementUtils.ts`

### Responsibility
Own pure queue behavior for automated Habiti announcements.

### Changes
- acknowledgement must become blocker-aware on promotion

### Interface contract
Helpers must continue to expose queue creation, enqueue, acknowledge, and active-item access.

### Logic rules
- payload ids are not part of acknowledgement semantics
- acknowledgement removes the current active item when one exists
- queued promotion occurs only when no blocking overlay remains active

## 6.11 `src/engine/runtime/types/runtimeCommandPayloadsHabiti.ts`

### Responsibility
Define the Habiti announcement acknowledgement payload shape.

### Changes
- remove `habitusIds` from the acknowledgement payload

### Interface contract
`ACKNOWLEDGE_HABITI_ANNOUNCEMENT` uses an empty payload contract.

### Logic rules
- no request-time identity matching is allowed

## 6.12 `src/game/handlers/AcknowledgeHabitiAnnouncementHandler.ts`

### Responsibility
Apply acknowledgement of the active Habiti gain modal.

### Changes
- remove payload/id matching
- make acknowledgement idempotent
- delegate promotion rules to blocker-aware queue helpers

### Interface contract
The handler consumes `ACKNOWLEDGE_HABITI_ANNOUNCEMENT` with no payload fields.

### Logic rules
- if no active item exists, do nothing except remain safely idempotent
- must not mutate facts, Cave ownership, or absorption totals

## 6.13 `src/ui/runtime/world/selection/absorption/BodySelector.tsx`

### Responsibility
Render the absorption preview summary.

### Changes
- add the `Already Owned` line when duplicate/owned Habiti are present

### Interface contract
Must render only semantic preview data from `useBodySelector`.

### Logic rules
- no absorption business logic in the component
- no heuristic calculations in the component

## 6.14 `src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.tsx`

### Responsibility
Render the authored body identity taxonomy controls.

### Changes
- add `SmartTooltip` coverage to every interactable field/control

### Interface contract
All four taxonomy fields must expose explanatory tooltip copy.

### Logic rules
- continue to mutate draft only through session state

## 6.15 `src/ui/devtools/editors/config/body/habiti/HabitiEditor.tsx`

### Responsibility
Render the top-level Habiti registry editor container.

### Changes
- add `SmartTooltip` coverage to all interactable controls owned by this component

### Logic rules
- no business logic beyond editor wiring

## 6.16 `src/ui/devtools/editors/config/body/habiti/HabitusRowEditor.tsx`

### Responsibility
Render one Habitus row.

### Changes
- add `SmartTooltip` coverage to the expandable title/header and all interactable controls

### Interface contract
The row must clearly explain:
- id
- label
- description
- type
- delete/remove action

### Logic rules
- title tooltip must explain the expand/open action or the row purpose

## 6.17 `src/ui/devtools/editors/config/body/habiti/HabitusEffectsSection.tsx`

### Responsibility
Render and manage the effects subsection for one Habitus.

### Changes
- add tooltip coverage to add/remove controls and subsection header interactions

### Logic rules
- no effect business logic outside draft manipulation and display

## 6.18 `src/ui/devtools/editors/config/body/habiti/HabitusEffectRow.tsx`

### Responsibility
Render one Habitus effect row.

### Changes
- add tooltip coverage to every interactable control
- render only the fields relevant to the current effect type

### Interface contract
Field visibility must be:
- `add_cave_attribute`: `type`, `attribute`, `amount`
- `add_absorption_xp_conversion`: `type`, `amount`
- `add_resource_gain_multiplier`: `type`, `resource`, `amount`

### Logic rules
- hidden fields must not remain visually editable
- existing draft state for irrelevant fields may be normalized upstream or preserved until save according to current editor conventions, but the row must not expose irrelevant controls

## 6.19 `src/ui/devtools/editors/config/body/habiti/HabitusConstraintsSection.tsx`

### Responsibility
Render identity/exclusion constraints for one Habitus.

### Changes
- add tooltip coverage to every interactable field/control

### Interface contract
Tooltip copy must explain the effect of:
- excludes
- allowed species
- allowed genders
- allowed social categories
- allowed professions

## 6.20 `src/ui/devtools/editors/config/body/rules/HabitiRulesEditor.tsx`

### Responsibility
Render the ordered Habiti rules editor container.

### Changes
- add tooltip coverage to all interactable controls owned by this component

### Logic rules
- no Habiti business logic beyond editor wiring

## 6.21 `src/ui/devtools/editors/config/body/rules/HabitiRuleRow.tsx`

### Responsibility
Render one Habiti rule row.

### Changes
- add tooltip coverage to every interactable field/control
- replace freeform candidate-id editing with registry-derived candidate editing

### Interface contract
The row must expose:
- id
- label
- habitus type
- required
- chance
- max picks
- candidate ids

Candidate-id editing must use the current Habiti registry and the selected `habitusType`.

### Logic rules
- candidate-id suggestions must update when rule type changes
- incompatible candidate ids must not remain silently accepted

## 6.22 `src/ui/devtools/editors/config/body/useBodyConfigSession.ts`

### Responsibility
Own shared Body-editor draft helpers and validation.

### Changes
- add validation helpers for duplicate rule ids
- add validation helpers for candidate-id validity
- expose registry-derived candidate suggestion data for rules

### Interface contract
The hook/helpers must provide Body-editor components with the minimum derived data needed for:
- rule-id validation
- candidate suggestion generation
- candidate compatibility validation

### Logic rules
- validation remains draft/editor-level logic only
- no runtime generation or Habiti effect application here

## 6.23 `src/ui/runtime/attention/useActiveRuntimeAttention.ts`

### Responsibility
Provide the currently active runtime-attention plan.

### Changes
- no schema change required
- if needed, expose stable accessors that make selection/ring and defocus/light consumers use one canonical runtime-attention source

### Logic rules
- remains the single merged selector for runtime attention
- must not become display-business-logic heavy

## 6.24 `src/engine/phaser/effects/RuntimeVisualEffectsManager.ts`

### Responsibility
Render runtime visual effects such as persistent attention rings.

### Changes
- suppress ring rendering for the currently selected entity

### Interface contract
Ring rendering input must consider both:
- active runtime-attention ring ids
- current selected entity id

### Logic rules
- selected entity id masks ring rendering only
- no mutation of stored attention data

## 6.25 `src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.ts`

### Responsibility
Apply runtime-attention visual consequences to entity display instances.

### Changes
- expand from tutorial-only semantics to merged runtime-attention semantics if that is the smallest compatible change
- compute whether each instance is currently defocused for attention purposes
- drive transient light suppression for defocused instances

### Interface contract
The helper must apply, for each entity instance:
- deemphasis state
- interaction-blocked state
- light-suppressed state

### Logic rules
- focused entities keep normal light behavior
- defocused entities suppress LightModule emission only while defocused
- no ECS mutation

## 6.26 `src/engine/phaser/display/EntityVisualInstance.ts`

### Responsibility
Coordinate per-entity display modules.

### Changes
- expose a transient API for attention-based light suppression if the existing module surface does not already provide one

### Interface contract
Must allow the display manager to enable/disable attention-based light suppression without mutating authored light config.

### Logic rules
- this API is rendering-only and frame/transient in nature

## 6.27 `src/engine/phaser/display/modules/LightModule.ts`

### Responsibility
Own visible light emission for an entity display instance.

### Changes
- support transient suppression from runtime attention

### Interface contract
The module must combine:
- existing authored/runtime light state
- existing visibility state
- transient attention-suppression state

### Logic rules
- if attention-suppressed, no visible light is emitted
- removing suppression restores normal light evaluation immediately
- no authored/runtime component values are rewritten by this suppression

## 6.28 `src/game/tutorials/resolveTutorialBindings.ts`

### Responsibility
Resolve tutorial bindings, primary target, and tutorial self.

### Changes
- preserve resolved `selfId` for downstream runtime-attention and runtime-guidance projection consumers

### Interface contract
The resolved tutorial output must continue to include:
- `bindings`
- `primaryTargetId`
- `selfId`

If additional projection-facing metadata is needed, it must be derived here rather than rediscovered ad hoc elsewhere.

### Logic rules
- self resolution remains authoritative here
- silent fallback to `sys_world` after a failed explicit self resolution is forbidden

## 6.29 `src/game/tutorials/resolveTutorialAttentionPlan.ts`

### Responsibility
Convert resolved tutorial bindings into a resolved attention plan.

### Changes
- make self-directed attention semantics use tutorial `selfId`

### Interface contract
The resolver must accept the resolved tutorial self as an input.

### Logic rules
- `hide_all_but_self` focuses `selfId`
- `show_attention_effect_on_self` rings `selfId`
- these mechanisms must not use `binding.targetId` for self semantics

## 6.30 `src/game/tutorials/resolveTutorialBindingUtils.ts`

### Responsibility
Resolve tutorial guidance targets.

### Changes
- only if required by the existing binding flow, adjust target-resolution helpers so self-directed node-callout resolution can distinguish tutorial self from explicit guidance target

### Logic rules
- do not add new authored target syntax in this revision
- keep the change limited to repairing existing self propagation

## 6.31 `src/ui/runtime/tutorials/resolveRuntimeGuidances.ts`

### Responsibility
Project active tutorial runtime state into renderable guidance/callout models.

### Changes
- preserve tutorial self separately from binding target
- ensure self-directed callouts anchor to the resolved tutorial self when required by the existing tutorial semantics
- suppress and log when self-directed projection cannot resolve, rather than silently anchoring to `sys_world`

### Interface contract
The runtime guidance view model must be sufficient for overlay code to distinguish:
- explicit guidance target
- tutorial self target

### Logic rules
- no ad hoc `sys_world` fallback for self-directed node callouts
- selection/deselection targeting behavior elsewhere remains untouched

---

## 7. Files already correct and therefore removed from the remaining delta

The following areas were part of the previous delta but are now considered implemented and must not be re-added to this revision:
- Body Editor route and config-editor card wiring
- Runtime shell modal mounting
- merged runtime-attention consumption for notification visibility
- merged runtime-attention consumption for time-control visibility
- shared preview consumption in `useBodySelector`

This revision must remain a delta.
It must not restate already-landed work as if it were still pending.

---

## 8. Test plan

All tests must continue to follow the project testing standards:
- behavior-focused
- Given/When/Then readable structure
- real data/factories where possible
- no complex business logic tested in view tests

## 8.1 Unit tests

### Habiti generation and validation
Add or update unit tests proving:
- body update payload supports `habiti`
- identity backfill preserves `species`, `socialCategory`, and `profession`
- `assignBodyHabiti` still enforces `habitusType` when `candidateIds` is non-empty
- duplicate rule ids are rejected by the Body editor validation seam
- unknown candidate ids are rejected by the Body editor validation seam
- incompatible candidate ids are rejected by the Body editor validation seam

### Habiti announcement queueing
Add or update unit tests proving:
- acknowledgement is idempotent with no active item
- acknowledgement requires no payload ids
- queued promotion after acknowledgement occurs only when blockers are absent
- queued promotion does not occur when blockers remain active

### Tutorial attention and projection
Add or update unit tests proving:
- `hide_all_but_self` focuses resolved `selfId`
- `show_attention_effect_on_self` rings resolved `selfId`
- self-directed runtime guidance projection uses resolved `selfId`
- self-directed runtime guidance projection logs and suppresses instead of falling back to `sys_world` when self cannot resolve

### Runtime display/light helpers
Add or update unit tests proving:
- selected entity ring suppression masks ring rendering without mutating the attention plan
- defocused entities suppress LightModule emission
- focused entities do not suppress LightModule emission
- clearing defocus restores normal LightModule behavior

## 8.2 Integration tests

### Absorption integration
Add or update integration tests proving:
- `AbsorbBatchHandler` consumes `xpTotal` and `resourceTotals` from processing
- missing `sys_world` aborts without partial modal/Habiti side effects
- missing Cave aborts without partial ownership mutation
- `Already Owned` preview data is still derived from the shared resolver contract

### Tutorial/runtime-attention integration
Add or update integration tests proving:
- active runtime attention plus selection suppresses rings for the selected entity only
- active runtime attention defocus suppresses light behind non-focused entities
- tutorial self drives self-directed attention semantics across binding, attention-plan, and runtime-guidance projection
- selection and deselection targeting behavior remains unchanged

## 8.3 View tests

### Body editor views
Add or update view tests proving:
- every interactable control in Body identity, Habiti, and Habiti rules editors exposes a `SmartTooltip`
- `HabitusEffectRow` shows only the relevant fields for each effect type
- `HabitiRuleRow` uses registry-derived candidate editing rather than freeform comma-separated entry

### Runtime UI views
Add or update view tests proving:
- absorption preview renders `Already Owned` when appropriate
- selected entities do not show attention rings
- self-directed tutorial callouts anchor to the correct entity instead of `sys_world`

---

## 9. Non-negotiable implementation rules

1. No direct runtime mutation of `body.habiti` outside apply.
2. No duplicate config root for body settings.
3. No fallback from unresolved self-directed tutorial projection to `sys_world`.
4. No persistent mutation of light component state to implement attention-based light suppression.
5. No React component may contain Habiti business logic.
6. No Body editor interactable may ship without a `SmartTooltip`.
7. No freeform candidate-id entry may remain in the Habiti rules editor.
8. No broken or partial tests may be left behind.

---

## 10. Implementation sequence

1. Remove the illegal direct `body.habiti` mutation path by completing the update-payload/apply route.
2. Fix config and identity schema/backfill consistency.
3. Fix `assignBodyHabiti` candidate/type enforcement.
4. Complete absorption processing result shape and handler hard-failure behavior.
5. Fix Habiti acknowledgement payload and blocker-aware queue promotion.
6. Finish Body editor validation and SmartTooltip coverage.
7. Add registry-derived candidate-id editing for Habiti rules.
8. Add selection-based ring suppression.
9. Add attention-based transient light suppression.
10. Repair tutorial self propagation through attention and runtime-guidance/callout projection.
11. Add and pass all required tests.

This order is mandatory because it resolves authoritative runtime contracts before editor and rendering polish consumes them.
