Scope

The remaining implementation work is limited to these unresolved contract gaps:

the remaining direct body.habiti write in spawn-time identity assignment
incomplete consumption of xpTotal and resourceTotals in absorption apply handling
the remaining Body editor standards gap:
missing tooltip coverage on the Body identity editor row header
rule-id rejection not enforced by the editor session seam
candidate-id editing still accepts freeform comma input
attention-based light suppression still depends on mutating runtime entities with ad hoc state
tutorial self still falls back to sys_world, and self-directed attention still falls back to binding.targetId

These are the only production deltas I am carrying forward. That is intentional. The current archive already satisfies the other revision-2 items I am not repeating here.

Files intentionally unchanged

I am not specifying changes to these files because the current archive already satisfies the relevant contract, or because the prior review concern does not hold after reading the actual linker/runtime path:

src/game/systems/body/updatePayload.ts
src/game/systems/body/resolveBodyIdentityTickState.ts
src/game/systems/body/identityBackfill.ts
src/game/habiti/assignBodyHabiti.ts
src/game/habiti/habitiAnnouncementUtils.ts
src/game/handlers/AcknowledgeHabitiAnnouncementHandler.ts
src/ui/runtime/world/selection/absorption/BodySelector.tsx
src/engine/phaser/effects/RuntimeVisualEffectsManager.ts
src/ui/runtime/tutorials/resolveRuntimeGuidances.ts
src/data/schemas/v2/config.ts
src/engine/terminal/commands/projectCartridgeAdapter.ts

SysConfigSchema is the schema for the settings object consumed from cartridge.config.settings, not the module root, so I am not treating that file as an active delta in this archive.

Production files to change

1. src/engine/runtime/handlers/spawnBodyIdentity.ts

Responsibility
Compute spawn-time body identity data for newly created body entities.

Required change
Keep the current passport/identity derivation behavior, but stop writing body.habiti directly.

Interface
Keep the existing function name and primary inputs.
Change the function contract so it returns:

pendingHabiti: string[] | null

It may continue to mutate body.passport in-place during spawn construction, because spawn is building the new entity payload before the entity is read by systems. It must not mutate body.habiti.

Logic

Preserve current behavior for:
allocating identitySerial
updating sys_world.state.bodySerial
filling avatarDisplayKey
generating missing authored identity fields
Compute the target Habiti with the existing assignBodyHabiti seam and current settings source: context.cartridge.config?.settings?.body
Compare computed Habiti to the existing body.habiti
If unchanged, return pendingHabiti = null
If changed, return the sorted-unique Habiti array as pendingHabiti
Do not assign that array onto body.habiti

Error handling

No new silent fallback
No direct write to body.habiti 2) src/engine/runtime/handlers/SpawnHandler.ts

Responsibility
Apply the SPAWN command and add the new entity to the world.

Required change
Consume the new return value from ensureSpawnedBodyIdentity and route any Habiti write through UPDATE_BODIES_BATCH.

Interface
No command schema change.

Logic

Call ensureSpawnedBodyIdentity(...) before world.add(entity) exactly as now
Capture pendingHabiti
Add the entity to the world first
After the entity exists in the world, if pendingHabiti is non-null:
enqueue one UPDATE_BODIES_BATCH command with one body update entry:
entityId
habiti
Do not call UpdateBodiesBatchHandler directly
Do not mutate entity.body.habiti directly
Preserve all current spawn behavior for:
sys_world in-place merge
physics setup
overlap resolution
mirrored fact enqueueing

Error handling

If pendingHabiti is non-null and context.commands is absent, log loudly and leave the spawned body’s existing habiti value unchanged
No fallback direct mutation is allowed

This closes the remaining body.habiti mutation gap while still reusing the existing apply-path handler.

3. src/game/handlers/spawnFromBlueprint.ts

Responsibility
Programmatic blueprint spawn helper outside the main SpawnHandler class.

Required change
Mirror the same Habiti-routing behavior as SpawnHandler.ts.

Interface
No signature change required.

Logic

Same sequence as SpawnHandler.ts:
derive pendingHabiti
add entity
enqueue UPDATE_BODIES_BATCH if needed
No direct body.habiti mutation

Error handling

Same loud-log behavior when a pending update exists but context.commands is unavailable 4) src/game/handlers/AbsorbBatchHandler.ts

Responsibility
Handle ABSORB_BATCH during apply.

Required change
Consume the full processing result from processAssignedEntities.

Interface
No command type change.

Logic

Destructure:
processed
killedEntityIds
newHabiti
xpTotal
resourceTotals
Pass all five values into the metadata write-through helper
Keep the current prerequisite aborts exactly as they are
Keep current assignment clearing, progress reset, announcement enqueueing, and cave counters exactly as they are

Non-goals

Do not change transfer-node creation logic
Do not recompute totals in the handler
Do not move processing logic out of processAssignedEntities 5) src/game/handlers/absorptionBatchCommandMetadata.ts

Responsibility
Write apply-phase absorption metadata onto the command payload and enqueue mirrored Habiti facts.

Required change
Extend metadata write-through to include the two processing fields the handler currently drops.

Interface
Extend the written payload shape to include:

xpTotal?: number
resourceTotals?: Array<{ resource: string; amount: number }>

Logic

Continue writing:
killedEntityIds
processedCount
newHabiti
Also write:
xpTotal
resourceTotals
Keep mirrored fact enqueueing based only on newHabiti
Do not derive or normalize totals here; this file only copies the handler result into command metadata

This is the smallest grounded way to make AbsorbBatchHandler actually consume the full processing result without inventing a new telemetry surface.

6. src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.tsx

Responsibility
Render the authored identity taxonomy editor section.

Required change
Add explicit tooltip coverage to the expandable/clickable row header.

Interface
No prop change.

Logic

Add titleTooltip to the ComponentRow
Keep the four existing StringArrayField controls unchanged
Keep all draft writes going through session state only

This file’s only remaining gap is tooltip coverage on the row header itself.

7. src/ui/devtools/editors/config/body/bodyRuleValidation.ts

Responsibility
Own pure Body-rule validation helpers.

Required change
Add one pure helper for rule-id rejection so duplicate rule-id handling lives in the validation seam, not ad hoc in the component.

Interface
Add:

validateHabitiRuleIdChange(rules, index, nextId)

Return shape:

success with normalized id
or failure with explicit reason:
empty
duplicate

Keep the existing candidate helper exports.

Logic

Trim the candidate id
Reject empty ids
Reject duplicates against every rule except the rule at the provided index
Preserve current candidate suggestion and candidate validation helpers unchanged 8) src/ui/devtools/editors/config/body/useBodyConfigSession.ts

Responsibility
Own Body-editor draft mutation and validation wiring.

Required change
Add rule-id and rule-type mutation methods that enforce validation centrally.

Interface
Add these returned members:

renameRule(index: number, nextId: string): string | null
setRuleHabitusType(index: number, nextType: HabitiRule["habitusType"]): void
commitRuleCandidateIds(index: number, candidateIds: string[]): string[]

Keep existing members.

Logic

renameRule
call validateHabitiRuleIdChange
if invalid, do not mutate the draft and push one error toast
if valid, update only that rule’s id
setRuleHabitusType
update the rule’s habitusType
immediately revalidate that rule’s current candidateIds against the new type
persist only the valid ids
if any ids were removed as incompatible or unknown, push one error toast
commitRuleCandidateIds
validate with existing validateHabitiRuleCandidates
return only valid ids in stable input order
remove duplicates
push one error toast if any submitted ids were unknown or incompatible
removeHabitus
after removing a Habitus from the registry, remove that id from every rule’s candidateIds
renameHabitus
after renaming a Habitus id, rewrite every rule’s candidateIds from old id to new id, preserving order and uniqueness

Non-goals

no runtime Habiti generation logic
no effect application logic
no save-system changes

This keeps validation in the existing session hook and existing pure helper seam, which matches the project’s UI architecture rules.

9. src/ui/devtools/editors/fields/string-array-field/AutocompleteStringArrayField.tsx

Responsibility
Edit an array of string ids constrained to a known suggestion set.

Required change
Replace the current comma-separated freeform editor with a constrained array editor.

Interface
Keep the current prop surface:

label
filename
path
suggestions
tooltip
onCommitValues?

No new required props.

Logic

Read the current draft value as an ordered string array
Render the current values as discrete selected items
Each selected item must have a remove control
Render one add-input for a single candidate at a time
Only exact matches from suggestions may be committed
Freeform comma-separated submission is forbidden
Duplicate values must not be committed
Preserve stable order of accepted ids
If onCommitValues is supplied, pass the candidate array through it before persisting
Keep SmartTooltip on the label
Add SmartTooltip to each remove control

Non-goals

no generic multi-select framework
no Habiti business logic in this component

Revision 2 treated this as a new file. In the current archive it already exists, so it must be changed, not added.

10. src/ui/devtools/editors/config/body/rules/HabitiRuleRow.tsx

Responsibility
Render one Habiti rule row.

Required change
Replace the separate freeform ID text field and the freeform comma-based candidate editor with session-driven validated controls.

Interface
The row must still expose:

id
label
habitus type
required
chance
max picks
candidate ids

Logic

Use EditableTraitId as the row title so rule id editing goes through renameRule
Remove the standalone ID SimpleStringField
Keep label, required, chance, and max picks as they are
Change the Habitus Type field to call setRuleHabitusType through onValueChange
Keep its draft path binding for persistence, but route the semantic mutation through the session method
Use the changed AutocompleteStringArrayField
Feed it suggestions from getCandidateSuggestions(habitusType)
Route candidate commit through commitRuleCandidateIds(index, candidateIds)
Keep tooltip coverage on the row header and all owned controls

Non-goals

no inline Habiti assignment logic
no registry scanning in the component 11) src/engine/phaser/display/EntityVisualInstance.ts

Responsibility
Own transient per-instance display state passed to display modules.

Required change
Add a transient attention-light suppression flag and use it only during module ticking.

Interface
Add one public method:

setAttentionLightSuppressed(suppressed: boolean): void

Keep all existing methods.

Logic

Store suppression as private transient instance state
In tick(...), if suppression is active, pass a shallow-cloned entity object to display modules with:
\_\_attentionLightSuppressed: true
If suppression is inactive, pass the original entity object unchanged
Do not mutate the source runtime entity
Keep setTutorialInteractionBlocked and use it from the display-attention helper

This reuses the existing LightModuleState check without rewriting the lighting pipeline or the runtime entity. It is the smallest contract-compliant fix.

12. src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.ts

Responsibility
Apply runtime-attention consequences to a display instance.

Required change
Make this helper own transient light suppression instead of mutating the runtime entity.

Interface
Keep applyTutorialAttentionToInstance(...).
Delete syncRuntimeAttentionToEntity(...).

Logic

Continue reading the active attention plan exactly as now
For focused-mode attention:
focused entity:
clear deemphasis
alpha = 1
interaction blocked = false unless another existing rule says otherwise
attention light suppression = false
non-focused entity:
apply deemphasis
alpha = 0.35
interaction blocked = blockNonFocusedInteraction
attention light suppression = true
When there are no focused ids:
clear deemphasis
alpha = 1
interaction blocked = false
attention light suppression = false
Call instance.setTutorialInteractionBlocked(...)
Call instance.setAttentionLightSuppressed(...)
Do not mutate the runtime entity object 13) src/engine/phaser/display/DisplayInstanceManagerTick.ts

Responsibility
Safe per-instance ticking wrapper.

Required change
Stop calling the deleted runtime-entity mutation helper.

Logic

Remove the call to syncRuntimeAttentionToEntity(...)
Leave everything else unchanged

No other display-manager file needs to change for this delta.

14. src/game/tutorials/resolveTutorialBindings.ts

Responsibility
Resolve tutorial bindings, primary target, and frozen tutorial self.

Required change
Remove the sys_world fallback for auto self.

Interface
Keep the current return shape:

bindings
primaryTargetId
selfId
or { error }

Logic

For tutorial.selfDefinition.kind === "auto":
selfId = primaryTargetId
if primaryTargetId is null, return the existing error shape:
Tutorial '<id>' self could not resolve.
For explicit self definitions, keep current resolution behavior
Continue stamping selfTargetId into every binding with the resolved selfId
No sys_world fallback is allowed

This is the remaining tutorial-self root cause in the current source.

15. src/game/tutorials/resolveTutorialAttentionPlan.ts

Responsibility
Project resolved tutorial bindings into an attention plan.

Required change
Make self-directed semantics depend only on tutorial self, never on the guidance target.

Interface
No signature change required.

Logic

For hide_all_but_self:
use only binding.selfTargetId
if missing, log loudly and skip the focus insertion
For show_attention_effect_on_self:
use only binding.selfTargetId
if missing, log loudly and skip the ring insertion
Do not fall back to binding.targetId
Keep all non-self attention behavior unchanged
Preserve current de-duplication and camera-focus derivation

resolveRuntimeGuidances.ts already suppresses unresolved self-directed callouts correctly, so it is not part of this delta.

Production files to add

None.

Tests to add or change

Tests must stay behavior-focused, colocated, and readable in Given/When/Then style, using real data and existing factories where possible.

A) Spawn-time Habiti routing

Add src/engine/runtime/handlers/spawnBodyIdentity.test.ts

Prove:

passport/identity generation still occurs
computed Habiti are returned as pendingHabiti
body.habiti is not mutated by the helper
unchanged Habiti return pendingHabiti = null

Change src/engine/runtime/handlers/SpawnHandler.identity.test.ts

Prove:

spawned bodies receive Habiti through queued UPDATE_BODIES_BATCH processing
no direct mutation fallback occurs when a follow-up update is required
B) Absorption result consumption

Add src/game/handlers/AbsorbBatchHandler.processingResult.test.ts

Prove:

command metadata includes xpTotal
command metadata includes resourceTotals
mirrored Habiti fact enqueueing still depends only on newHabiti
C) Body editor validation and constrained candidate editing

Change src/ui/devtools/editors/config/body/bodyRuleValidation.test.ts

Add cases proving:

rule-id change rejects duplicates
rule-id change rejects empty ids
same-row unchanged id is allowed as a no-op

Add src/ui/devtools/editors/fields/string-array-field/AutocompleteStringArrayField.test.tsx

Prove:

only exact suggested ids can be added
freeform comma-separated input is not accepted
duplicate ids are not added
remove control removes one selected id

Add src/ui/devtools/editors/config/body/identity/BodyIdentityCatalogEditor.test.tsx

Prove:

the expandable Identity Taxonomy row exposes a tooltip on its clickable header

Add src/ui/devtools/editors/config/body/rules/HabitiRuleRow.test.tsx

Prove:

rule id editing goes through the row title, not a freeform ID field
changing habitusType prunes incompatible candidate ids through the session seam
candidate suggestions are filtered to the current habitusType
candidate editing no longer accepts comma-separated arbitrary ids
D) Transient light suppression

Change src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.alpha.test.ts

Add assertions proving:

non-focused instances are marked light-suppressed
focused instances are not light-suppressed
clearing focus clears suppression

Change src/engine/phaser/display/DisplayInstanceManager.tutorialAttention.test.ts

Add assertions proving:

only non-focused instances are light-suppressed
source runtime entities do not gain \_\_attentionLightSuppressed after ticking
E) Tutorial self

Change src/game/tutorials/resolveTutorialBindings.test.ts

Replace the current sys_world fallback expectation with:

auto self resolves from the first effective target when present
auto self with no resolved target returns { error }

Change src/game/tutorials/resolveTutorialAttentionPlan.test.ts

Add cases proving:

self-directed focus uses selfTargetId
self-directed ring uses selfTargetId
missing selfTargetId logs and suppresses instead of falling back to targetId
