# Habiti Identity Redesign LLD

## Status

This document replaces the current passport-first identity split with a Habiti-first model.

## Why

The current implementation encodes identity in two places:

1. `body.passport` stores authored or generated identity axes and generated name parts.
2. `body.habiti` stores additional identity-like categorization and gameplay effects.

That split is structurally wrong.

Observed problems in the current source:

- `PassportSchema` stores `gender`, `species`, `socialCategory`, `profession`, and generated name fragments.
- `assignBodyHabiti` reads those passport fields to decide which Habiti can exist.
- `resolveHabitiEligibility` gates Habiti eligibility on passport axes, not on already-assigned Habiti.
- `BodySettingsSchema` authors a separate identity taxonomy (`species`, `genders`, `socialCategories`, `professions`) and also authors Habiti assignment rules.
- `HabitusTypeIdSchema` includes `sexual_preference`, but passport does not contain a matching field and the eligibility path does not read it. The current model is already incomplete.
- The body editor still authors identity taxonomy separately from the Habiti registry, so the registry is not the source of truth.

The redesign must remove that duplication.

## Design goals

1. `body.habiti` is the only canonical source of body identity.
2. `passport` becomes presentation and deterministic-seed data only.
3. Generated names are a deterministic projection of canonical Habiti, not authored identity fields on passport.
4. Identity taxonomy is derived from the Habiti registry and is never authored separately.
5. Body generation rules are defined per `HabitusTypeId`, not as arbitrary rule rows with freeform IDs.
6. Runtime mutation remains command-driven and apply-phase only.
7. UI remains render-only; validation and semantic rewrites stay in session and pure-helper seams.
8. Legacy identity detritus is removed instead of preserved behind compatibility shims.

## Non-goals

1. No new runtime mutation path.
2. No new save-system feature.
3. No new generic editor framework.
4. No new naming authoring schema beyond what is required to make names Habiti-driven using the existing catalog asset.
5. No change to passport usage that is purely presentational (`name`, `description`, `portraitIcon`, `glyphKey`, `identitySerial`, `avatarDisplayKey`).
6. No change to effect application, absorption, tutorials, or unrelated systems.

## Target model

### Canonical identity

Canonical body identity is the sorted unique set of assigned Habiti IDs in `body.habiti`.

Identity semantics come from the registry entry for each assigned Habitus:

- `type = species`
- `type = gender`
- `type = social_category`
- `type = profession`
- `type = sexual_preference`
- `type = unique_body`

`unique_body` remains a non-axis authored category. It may coexist with identity Habiti but is not treated as an identity axis for naming.

### Passport

`passport` remains on the body component, but only for presentation and deterministic render seeding.

The redesign keeps these passport fields:

- `name`
- `description`
- `portraitIcon`
- `glyphKey`
- `identitySerial`
- `avatarDisplayKey`

The redesign removes these passport fields:

- `gender`
- `givenName`
- `familyRoot`
- `familySuffix`
- `familyName`
- `species`
- `socialCategory`
- `profession`

No other file may read identity semantics from passport after this redesign.

### Body settings

`config.settings.body` no longer authors taxonomy arrays and no longer authors arbitrary `habitiRules`.

It authors one optional generation rule per `HabitusTypeId`.

Rule semantics per type:

- `probability`: per-roll continuation probability for this type.
- `maxCount`: hard cap for the number of Habiti of this type that may be assigned by generation.
- `weightedPool`: the weighted set of Habiti IDs that may be assigned for this type.

If a type has no rule, generation does not assign Habiti of that type.

### Names

Generated names remain stored in `passport.name`, but `passport.name` is derived from canonical Habiti.

No name fragments are persisted.

The generator uses:

- `identitySerial`
- the sorted assigned identity Habiti IDs whose type is not `unique_body`
- the existing name catalog asset
- the existing used-name de-duplication behavior

No part of generated name construction may depend on passport identity fields, because those fields no longer exist.

## Data contract changes

### `PassportSchema`

New contract:

- keep `name`, `description`, `portraitIcon`, `glyphKey`, `identitySerial`, `avatarDisplayKey`
- remove every identity axis field and every generated name-part field

### `HabitusDefinitionSchema`

Keep:

- `id`
- `label`
- `description`
- `type`
- `effects`
- `excludes`

Remove:

- `allowedSpecies`
- `allowedGenders`
- `allowedSocialCategories`
- `allowedProfessions`

Reason:

Those fields are passport-coupled identity detritus. The uploaded content does not use them meaningfully, and the redesign does not replace them with a new speculative feature.

Compatibility is limited to exclusion checks against already-assigned Habiti.

### `BodySettingsSchema`

Remove:

- `species`
- `genders`
- `socialCategories`
- `professions`
- `habitiRules`

Add:

- `habitusTypeRules`

Each entry in `habitusTypeRules` has this contract:

- `habitusType: HabitusTypeId`
- `probability: finite number in [0, 1]`
- `maxCount: integer >= 0`
- `weightedPool: ordered array of pool entries`

Each weighted pool entry has this contract:

- `habitusId: string`
- `weight: finite number > 0`

Additional invariants:

- there is at most one rule per `HabitusTypeId`
- `weightedPool` entries must be unique by `habitusId`
- every `weightedPool.habitusId` must exist in `config.habiti`
- every `weightedPool.habitusId` must have `definition.type === rule.habitusType`

## Runtime behavior

### Assignment algorithm

`assignBodyHabiti` becomes Habiti-driven.

Input contract:

- `identitySerial`
- `existingHabiti`
- `settings`
- `habitusIndex`

Removed input:

- `passport`

Algorithm per type rule:

1. Start with `assigned = sortedUnique(existingHabiti)`.
2. Read rules in authored order.
3. For the current rule, initialize `pickIndex = 0`.
4. While `pickIndex < maxCount`:
    - roll continuation using the existing deterministic `pseudoRandom` utility and a stable key derived from `identitySerial`, `habitusType`, and `pickIndex`
    - if the roll misses, stop processing this type rule immediately
    - resolve the eligible weighted pool for this rule
    - if no eligible candidates remain, stop processing this type rule immediately
    - select one candidate by deterministic weighted random using stable authored pool order
    - add the selected Habitus ID to `assigned`
    - increment `pickIndex`
5. Return `sortedUnique(assigned)`.

There is no `required` concept in the new model.

Semantics:

- `probability = 1` means continue until `maxCount` or pool exhaustion
- `probability = 0` means this type never generates
- selection is without replacement because duplicate Habiti IDs are forbidden on a body

### Compatibility algorithm

`resolveHabitiEligibility` becomes a pure compatibility check over assigned Habiti.

Input contract:

- `definition`
- `assignedHabiti`
- `habitusIndex`

Removed input:

- `passport`

Eligibility rules:

1. Reject if `definition.id` is already assigned.
2. Reject if `definition.excludes` contains any assigned Habitus ID.
3. Reject if any already-assigned Habitus definition exists in the registry and its `excludes` contains `definition.id`.
4. Otherwise accept.

There is no passport-axis gating.

Unknown assigned Habiti IDs do not crash generation. They remain in the assigned set, and reciprocal exclusion checks only consult registry definitions that exist.

### Identity backfill and body-system flow

Identity generation order becomes:

1. allocate `identitySerial` if missing
2. derive `avatarDisplayKey` if missing
3. compute generated Habiti from the current assigned set using the Habiti-only algorithm
4. compute generated `passport.name` only if the current name is blank or `Unknown`
5. return `passportPatch` and `habitiPatch` separately

The body-system path must stop tunneling Habiti through `passportPatch` metadata.

New `resolveBodyIdentityTickState` return contract:

- `passportPatch: Partial<Passport> | null`
- `habitiPatch: string[] | null`
- `nextIdentitySerial: number`

`buildBodyUpdatePayload` must accept `passportPatch` and `habitiPatch` as separate inputs.

`__nextHabiti` is removed completely.

### Spawn-time identity flow

`ensureSpawnedBodyIdentity` keeps its current high-level role and still returns `pendingHabiti: string[] | null`.

Changed behavior:

- it does not read or derive identity from passport axes
- it computes pending Habiti from the Habiti-only assignment path
- it generates `passport.name` from canonical Habiti when the name is blank or `Unknown`
- it does not mutate `body.habiti` directly

The existing queued `UPDATE_BODIES_BATCH` follow-up remains the only write path for Habiti after spawn.

## Name-generation behavior

### Source of truth

The existing static body name catalog remains the source of candidate name fragments.

The redesign does not introduce a new authored naming config surface.

### Catalog structure

The catalog is flattened to remove gender-specific storage.

New catalog shape:

- `givenNames`
- `familyRoots`
- `familySuffixes`

Reason:

The current male/female split is legacy passport-coupled identity detritus. After this redesign, gender is expressed through Habiti, not through passport fields, and the current source tree contains no generic authored mapping from arbitrary gender Habiti IDs to gendered name pools.

### Generator contract

`generateBodyIdentity` keeps its existing file and role but changes contract.

Input contract:

- `identitySerial`
- `assignedHabiti`
- `habitusIndex`
- `catalog`
- `usedNames`

Removed input:

- `passport`

Output contract:

- `Partial<Passport> | null`
- the returned patch may only contain `name`

Deterministic seed:

- the sorted assigned identity Habiti IDs whose type is not `unique_body`
- `identitySerial`

Algorithm:

1. If `passport.name` is already non-placeholder, do not generate a replacement.
2. Build a deterministic salt from the sorted identity Habiti IDs.
3. Use the existing uniqueness loop and existing deterministic random utility to select a candidate name from the flattened catalog.
4. Return only `{ name }`.

No generated first-name, family-root, family-suffix, or family-name fragments are persisted anywhere.

## Editor redesign

### General rules

1. Registry is the only taxonomy authority.
2. UI components remain presentation-only.
3. Session actions own semantic mutation, pruning, and rewrite behavior.
4. Validation helpers remain pure.
5. The editor must never allow a rule pool entry whose Habitus type does not match the rule type.

### Derived taxonomy section

`BodyIdentityCatalogEditor` is retained but repurposed.

New responsibility:

- render a read-only derived summary of registry entries grouped by identity-related `HabitusTypeId`

It must:

- read from `config.habiti`
- group by `species`, `gender`, `social_category`, `profession`, and `sexual_preference`
- sort IDs stably
- show counts and IDs
- perform no draft writes

It must not render editable taxonomy arrays.

### Habitus constraints section

`HabitusConstraintsSection` is reduced to exclusion editing only.

It must keep:

- `Excludes`

It must remove:

- `Allowed Species`
- `Allowed Genders`
- `Allowed Social Categories`
- `Allowed Professions`

### Rule rows

A rule row now represents one `HabitusTypeId` generation rule.

The row must expose only:

- `Habitus Type`
- `Probability`
- `Max Count`
- `Weighted Pool`

The row must not expose:

- rule id
- label
- required
- candidate ids as a raw string array

Rule-row semantics:

- changing `Habitus Type` must route through the session seam
- changing type to one already used by another rule is rejected and does not mutate draft state
- changing type immediately prunes incompatible pool entries
- row summary should display the type and current pool size

### Weighted pool field

A new dedicated field component is required for the rule pool.

Responsibilities:

- show the currently selected pool entries in authored order
- allow adding one exact-match Habitus ID at a time from the filtered suggestion set
- allow editing weight per selected entry
- allow removing one selected entry at a time
- delegate semantic pruning and validation to the session seam

The field must not accept freeform comma-separated input.

The field must not allow duplicate `habitusId` entries.

### Session behavior

`useBodyConfigSession` and `bodyConfigSessionActions` must own these behaviors:

1. add a new type rule using the first missing `HabitusTypeId`
2. reject duplicate rule types
3. prune weighted-pool entries that become incompatible after rule-type changes
4. remove weighted-pool entries when a Habitus is deleted from the registry
5. rewrite weighted-pool entries when a Habitus ID is renamed
6. prune weighted-pool entries when a Habitus definition changes type and no longer matches the rule type

A new session action is required for Habitus type changes in the registry:

- `setHabitusType(habitusId, nextType)`

That action must:

- update the Habitus definition type
- scan every type rule pool
- remove any pool entry whose referenced Habitus no longer matches the containing rule type
- emit one error toast if any entries were removed

## File-by-file production changes

### 1. `src/data/schemas/game/body.ts`

Responsibility:

- define canonical runtime body and passport contracts

Change:

- remove identity axis fields and generated name-part fields from `PassportSchema`

Interface:

- `Passport` remains exported
- `BodyComponent` remains exported
- `BodyUpdatePayload.passport` continues to use `Partial<Passport>` through the existing runtime types import

### 2. `src/data/schemas/game/habiti.ts`

Responsibility:

- define Habiti registry and body settings contracts

Change:

- remove legacy `allowed*` fields from `HabitusDefinitionSchema`
- replace `HabitiRuleSchema` with a new per-type generation-rule schema
- replace old `BodySettingsSchema` taxonomy arrays and `habitiRules` with `habitusTypeRules`

Interface:

- keep `HabitusTypeIdSchema`
- keep `HabitusDefinitionSchema`
- export the new weighted-pool entry type and new type-rule type

### 3. `src/lib/body-identity/body_identity_name_catalog.json`

Responsibility:

- provide the static source catalog for generated names

Change:

- flatten `maleFirstNames` and `femaleFirstNames` into one `givenNames` list

Interface:

- JSON keys become `givenNames`, `familyRoots`, `familySuffixes`

### 4. `src/lib/body-identity/bodyIdentityCatalog.ts`

Responsibility:

- load and clone the static name catalog

Change:

- update the catalog type to match the flattened JSON structure

Interface:

- keep `bodyIdentityCatalog` export
- keep `BodyIdentityCatalog` export with the new shape

### 5. `src/lib/body-identity/bodyIdentityGenerator.ts`

Responsibility:

- derive generated body names deterministically

Change:

- remove passport-axis dependence
- remove generated name-part output
- derive deterministic selection salt from assigned identity Habiti

Interface:

- change input from `passport` to `assignedHabiti` plus `habitusIndex`
- output only `{ name }` or `null`

Logic:

- placeholder-name detection remains
- used-name reservation remains
- deterministic uniqueness walk remains
- only the seed source changes

### 6. `src/game/habiti/assignBodyHabiti.ts`

Responsibility:

- assign generated Habiti to a body from authored settings and registry definitions

Change:

- remove `passport` input
- replace arbitrary rule-row iteration with per-type rule iteration
- implement deterministic weighted selection
- stop using `required`
- stop using `candidateIds`

Interface:

- input becomes `{ identitySerial, existingHabiti, settings, habitusIndex }`
- output remains `string[]`

Logic:

- stable unique existing set remains the starting point
- per-type rolling continues until miss, exhaustion, or `maxCount`

### 7. `src/game/habiti/resolveHabitiEligibility.ts`

Responsibility:

- validate whether a candidate Habitus is compatible with the current assigned set

Change:

- remove all passport-axis logic
- add reciprocal exclusion checks against assigned Habiti definitions

Interface:

- input becomes `{ definition, assignedHabiti, habitusIndex }`
- output remains boolean

### 8. `src/game/systems/body/identityBackfill.ts`

Responsibility:

- derive runtime body identity patches during body-system processing

Change:

- normalize only presentational passport fields
- compute Habiti before generated name
- generate name from canonical Habiti
- stop carrying legacy passport identity axes

Interface:

- return shape remains `{ passportPatch, habitus, nextIdentitySerial }`

Logic:

- `passportPatch` may contain `identitySerial`, `avatarDisplayKey`, `name`
- `habitus` is computed from the Habiti-only assignment path

### 9. `src/game/systems/body/resolveBodyIdentityTickState.ts`

Responsibility:

- prepare body-system identity updates for one entity per tick

Change:

- stop embedding Habiti in `passportPatch`
- return `habitiPatch` separately

Interface:

- new return shape: `{ passportPatch, habitiPatch, nextIdentitySerial }`

### 10. `src/game/systems/body/processEntityOptions.ts`

Responsibility:

- define the process-body options contract

Change:

- add `habitiPatch?: string[] | null`
- keep `passportPatch?: Partial<Passport> | null`

### 11. `src/game/systems/body/processEntity.ts`

Responsibility:

- build the final body update payload for one entity

Change:

- pass separate `passportPatch` and `habitiPatch` into `buildBodyUpdatePayload`

Interface:

- signature remains backward-compatible except for the expanded options object

### 12. `src/game/systems/body/updatePayload.ts`

Responsibility:

- build `BodyUpdatePayload`

Change:

- remove `__nextHabiti` handling completely
- accept `habitiPatch` as a direct argument

Interface:

- `buildBodyUpdatePayload(entityId, body, progression, passportPatch, habitiPatch)`

Logic:

- compare `habitiPatch` directly to `body.habiti`
- compare `passportPatch` directly to `body.passport`

### 13. `src/game/systems/BodySystem.ts`

Responsibility:

- orchestrate body tick processing and queue update commands

Change:

- consume `habitiPatch` separately from `resolveBodyIdentityTickState`
- pass both patches into `processBodyEntity`

Interface:

- constructor and public `tick` signature remain unchanged

### 14. `src/engine/runtime/handlers/spawnBodyIdentity.ts`

Responsibility:

- derive spawn-time identity fields for newly created bodies

Change:

- compute generated Habiti without passport-axis input
- generate `passport.name` from canonical Habiti when needed
- keep returning `pendingHabiti`

Interface:

- keep current public signature and return type

### 15. `src/ui/devtools/editors/config/body/BodyEditor.tsx`

Responsibility:

- compose the body editor sections

Change:

- keep the identity section only as a derived summary
- keep registry and rules sections
- do not render any editable taxonomy arrays

### 16. `src/ui/devtools/editors/config/body/bodyPaths.ts`

Responsibility:

- centralize draft-path constants for the body editor

Change:

- remove taxonomy paths
- replace old rules path with the new `habitusTypeRules` path

### 17. `src/ui/devtools/editors/config/body/bodyEditorDefaults.ts`

Responsibility:

- create default body-editor draft records

Change:

- remove default legacy rule shape
- add default type-rule shape
- remove legacy `allowed*` fields from default Habitus definition

### 18. `src/ui/devtools/editors/config/body/bodyRuleValidation.ts`

Responsibility:

- own pure validation and suggestion helpers for body generation rules

Change:

- remove duplicate rule-id helpers
- add duplicate rule-type helpers
- add weighted-pool normalization helpers
- keep type-based suggestion helper

Interface:

Required helpers:

- `getHabitusPoolSuggestions(habitusIndex, habitusType)`
- `validateHabitusTypeRuleTypeChange(rules, index, nextType)`
- `validateWeightedPoolEntries(entries, habitusIndex, habitusType)`

Validation result must explicitly report:

- valid entries
- duplicate ids
- unknown ids
- incompatible ids

### 19. `src/ui/devtools/editors/config/body/bodyConfigSessionActions.ts`

Responsibility:

- own semantic body-editor mutations and cross-field rewrites

Change:

- remove rule-id actions
- add rule-type validation action
- add weighted-pool commit action
- add registry Habitus-type rewrite action
- keep rename and remove propagation across pools

Interface:

Required actions:

- `addTypeRule()`
- `removeTypeRule(index)`
- `setRuleHabitusType(index, nextType)`
- `commitWeightedPool(index, nextEntries)`
- `setHabitusType(habitusId, nextType)`
- `removeHabitus(id)`
- `renameHabitus(oldId, nextId)`

### 20. `src/ui/devtools/editors/config/body/useBodyConfigSession.ts`

Responsibility:

- expose body-editor draft state and session actions to UI components

Change:

- remove rule-id surface
- expose type-rule and weighted-pool actions
- expose registry-derived taxonomy groups for the read-only identity section
- expose the Habitus-type mutation action

### 21. `src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.tsx`

Responsibility:

- render the derived identity taxonomy summary

Change:

- stop rendering `StringArrayField`
- render grouped registry entries by type
- remain read-only

Interface:

- keep `filename` prop only

### 22. `src/ui/devtools/editors/config/body/habiti/HabitusConstraintsSection.tsx`

Responsibility:

- render compatibility constraints for one Habitus definition

Change:

- render only `Excludes`
- remove every passport-axis constraint field

### 23. `src/ui/devtools/editors/config/body/habiti/HabitusRowEditor.tsx`

Responsibility:

- render one Habitus definition row

Change:

- route type changes through `setHabitusType`
- keep the draft path for persistence, but make semantic pruning occur through the session seam

Interface:

- keep current public props

### 24. `src/ui/devtools/editors/config/body/rules/HabitiRulesEditor.tsx`

Responsibility:

- render and manage authored per-type generation rules

Change:

- iterate `habitusTypeRules`
- disable add when every `HabitusTypeId` already has a rule
- update section copy to match the new per-type model

### 25. `src/ui/devtools/editors/config/body/rules/HabitiRuleRow.tsx`

Responsibility:

- render one per-type generation rule row

Change:

- remove rule ID and label editing
- remove `required`
- remove raw candidate-ID editing
- expose only type, probability, max count, and weighted pool
- route type changes and pool commits through the session seam

### 26. `src/ui/devtools/editors/config/body/rules/WeightedHabitusPoolField.tsx` (new)

Responsibility:

- edit the ordered weighted pool for one type rule

Interface:

Required props:

- `label`
- `filename`
- `path`
- `suggestions`
- `tooltip`
- `onCommitEntries?`

Logic:

- show selected entries in order
- allow add by exact suggestion match only
- allow weight edits
- allow remove per entry
- do not allow comma-separated freeform input

### 27. `src/ui/devtools/editors/fields/string-array-field/AutocompleteStringArrayField.tsx` (delete)

Reason:

- after the rule model change, this component is no longer used by the body editor
- keeping it would leave dead detritus from the removed candidate-ID rule model

### 28. `src/data/raw/example/modules/core.cave`

Responsibility:

- provide the canonical authored example module used by the project

Change:

- remove body taxonomy arrays
- remove old `habitiRules`
- author the new `habitusTypeRules`
- remove empty `allowed*` fields from Habiti definitions

No compatibility bridge is added. The example content is updated in place.

## Files intentionally unchanged

These files remain valid under the redesign and should not change:

- `src/game/handlers/UpdateBodiesBatchHandler.ts`
- `src/engine/runtime/handlers/spawnPendingHabiti.ts`
- `src/engine/compiler/abilities/passportCompiler.ts`
- `src/lib/body-identity/collectUsedBodyNames.ts`
- `src/lib/body-identity/avatarDisplayKey.ts`
- `src/lib/body-identity/resolveSwarmAvatarKeys.ts`
- `src/engine/phaser/display/avatar/AvatarSeedResolver.ts`
- `src/ui/runtime/world/selection/selectionUtils/entity.ts`
- `src/ui/runtime/world/selection/body/bodyCardSelectors.ts`

Reason:

These files only consume presentational passport fields (`name`, `portraitIcon`, `identitySerial`, `avatarDisplayKey`) or already use the correct apply-path update seam.

## Test plan

All tests must remain behavior-focused, readable, colocated, and written in Given/When/Then style using real data and existing factories where possible.

### 1. `src/lib/body-identity/bodyIdentityGenerator.test.ts`

Change.

Prove:

- generated names are deterministic for the same `identitySerial` and same assigned Habiti
- changing the assigned identity Habiti changes the generated candidate sequence
- output contains only `name`
- placeholder detection still works
- used-name de-duplication still works

### 2. `src/game/habiti/assignBodyHabiti.test.ts`

Change.

Prove:

- rule pools only consider registry entries whose type matches the rule type
- per-type rolling stops on the first miss
- weighted selection is deterministic for a stable seed
- selection stops at `maxCount`
- existing assigned Habiti remain in the output

### 3. `src/game/habiti/resolveHabitiEligibility.test.ts` (new)

Add.

Prove:

- duplicate Habitus IDs are rejected
- candidate-side exclusion rejects assignment
- already-assigned-side exclusion rejects assignment
- unknown assigned Habiti do not crash eligibility checks

### 4. `src/game/systems/body/identityBackfill.test.ts`

Change.

Prove:

- backfill no longer normalizes removed passport identity fields
- generated Habiti are computed without passport-axis input
- generated name is derived after Habiti resolution
- `passportPatch` contains only presentational fields

### 5. `src/game/systems/BodySystem.identity.test.ts`

Change.

Prove:

- blank passports receive generated `name`, `identitySerial`, and `avatarDisplayKey`
- Habiti are written through direct `habiti` updates, not passport metadata tunneling
- authored non-placeholder names are preserved

### 6. `src/engine/runtime/handlers/spawnBodyIdentity.test.ts`

Change.

Prove:

- spawn-time name generation is Habiti-driven
- `pendingHabiti` is returned without mutating `body.habiti`
- unchanged generated Habiti return `null`

### 7. `src/engine/runtime/handlers/SpawnHandler.identity.test.ts`

Change.

Prove:

- spawned bodies receive Habiti through queued `UPDATE_BODIES_BATCH`
- no direct mutation fallback occurs when follow-up commands are unavailable
- inline fixture settings use the new `habitusTypeRules` contract

### 8. `src/ui/devtools/editors/config/body/bodyRuleValidation.test.ts`

Change.

Prove:

- duplicate rule types are rejected
- type-based suggestions are derived from the registry
- weighted-pool validation removes duplicates, unknown IDs, and incompatible IDs

### 9. `src/ui/devtools/editors/config/body/bodyConfigSessionActions.test.ts` (new)

Add.

Prove:

- removing a Habitus removes it from every weighted pool
- renaming a Habitus rewrites every weighted pool while preserving order and weight
- changing a Habitus definition type prunes stale pool entries across rules
- changing a rule type to a duplicate type is rejected and leaves draft state unchanged

### 10. `src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.test.tsx`

Change.

Prove:

- the section remains visible
- it renders registry-derived grouped identity IDs
- it does not render editable taxonomy `StringArrayField` controls

### 11. `src/ui/devtools/editors/config/body/rules/HabitiRuleRow.test.tsx`

Change.

Prove:

- the row no longer renders rule ID, label, or required controls
- changing `Habitus Type` prunes incompatible pool entries through the session seam
- changing `Habitus Type` to a duplicate type is rejected
- the weighted pool suggestions are filtered by the selected type

### 12. `src/ui/devtools/editors/config/body/rules/WeightedHabitusPoolField.test.tsx` (new)

Add.

Prove:

- only exact suggested IDs can be added
- freeform comma-separated input is rejected
- duplicate IDs are not added
- weights are editable
- remove control removes exactly one entry

### 13. `src/ui/devtools/editors/fields/string-array-field/AutocompleteStringArrayField.test.tsx` (delete)

Reason:

- the old candidate-ID editor no longer exists in the redesigned rule model

## Detritus removal checklist

The implementation is not complete unless all of the following are true:

1. `PassportSchema` no longer exposes identity axes or generated name fragments.
2. `HabitusDefinitionSchema` no longer exposes passport-axis `allowed*` fields.
3. `BodySettingsSchema` no longer exposes taxonomy arrays or old `habitiRules`.
4. No runtime file reads identity semantics from passport.
5. No runtime file tunnels Habiti through `passportPatch` metadata.
6. No editor file renders editable identity taxonomy arrays.
7. No editor file renders rule ID, rule label, `required`, or raw candidate-ID string arrays for Habiti generation.
8. No unused candidate-array field component remains in the body editor path.
9. The example module is authored only in the new schema.
10. All affected tests are updated to the new contract.

## Acceptance criteria

The redesign is complete only when:

1. `body.habiti` is the only canonical identity source.
2. generated names are deterministic projections of canonical Habiti.
3. passport contains no identity detritus beyond presentational name and render-seed fields.
4. body generation rules are authored per `HabitusTypeId` with probability, weighted pool, and max count.
5. runtime assignment respects reciprocal exclusion against already-assigned Habiti.
6. the body editor derives taxonomy from the registry and never authors it separately.
7. every changed or new test passes under the project testing standard.

