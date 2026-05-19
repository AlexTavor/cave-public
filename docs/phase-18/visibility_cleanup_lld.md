LLD: Enforce Storage Visibility Contract From Storage Config / Display Bars

1. Objective

Enforce a single, explicit contract for storage resource visibility:

For storage resources only, visibility is authoritative in compiled display.bars.
display.bars must be derived deterministically from current \_editor.abilities.storage[*].visible.
state[resource].visible is not authoritative for storage visibility and must not be allowed to suppress the resource lens or storage bars.
Compile-on-compiled blueprints must not retain stale storage artifacts from earlier authored states.

This LLD does not redefine generic state.visible semantics for non-storage state. It fixes storage visibility, removes storage-specific visibility detritus, and closes the handler bug where omitted visibility mutates existing state. That scope boundary follows the project contract against speculative refactors and unrelated cleanup.

2. Why this change is required
   2.1 The current contract is split across three competing signals

For storage today, all three of these exist simultaneously:

authored storage config: \_editor.abilities.storage[*].visible
compiled display contract: components.display.bars
runtime mutable state: state[resource].visible

The clean compile path correctly derives display bars from storage config, but the selection/runtime UI path still suppresses storage bars when state[resource].visible === false. That makes mutable runtime state override authored storage visibility.

2.2 Runtime mutations can incorrectly hide existing visible state

UpdateStateHandler and SetGlobalHandler both treat omitted visible as false on existing entries. Any command that updates only value or max can therefore hide an existing entry unintentionally. This is a general handler bug, not a storage-specific one.

2.3 Storage compilation is not deterministic on compile-on-compiled input

CompilerService.compile deep-clones the current blueprint and re-runs compilers over existing compiled output. Storage-generated artifacts are append/overwrite-only in several paths:

display bars are only appended if missing
storage tags are only added
entropy and auto-request generated artifacts are only removed when their compilers are invoked again
removing a storage ability, changing its resource, or disabling entropy/auto-request can leave stale artifacts behind

That means current authored storage config is not guaranteed to be the sole source of truth after recompilation.

2.4 Several tests still encode the obsolete “hidden larder food” assumption

Those tests are not testing visibility, but they still bake in stale visibility values. That obscures the real contract and weakens regression coverage.

3. Target contract
   3.1 Storage visibility contract

For any runtime entity E and storage resource R:

R is visible as storage iff there is a compiled storage display bar for R on E.
A storage display bar is the authoritative UI signal for:
resource lens eligibility
storage bar rendering in the selection card
3.2 Non-authoritative storage state fields

For storage resources:

state[R].visible may still exist
it may still be written by existing compilers or preserved in saved data
it must not be consulted when deciding whether storage is visible in the selection UI
3.3 Deterministic compile contract

Running compile repeatedly on the same blueprint, including a blueprint that already contains previously compiled output, must yield storage artifacts that reflect the current authored storage config only.

That includes:

storage state entries
storage display bars
storage tags
storage entropy generated state/effects
storage auto-request generated state/effects/rules
storage capacity scaler temp state/effects
3.4 Runtime handler contract

For UPDATE_STATE and SET_GLOBAL:

if visible is explicitly provided, it is authoritative
if visible is omitted and the entry already exists, visibility must be preserved
if visible is omitted and the entry does not yet exist, the new entry is created hidden (visible: false)

This preserves existing generic expectations while removing the current overwrite bug.

4. Non-goals

This LLD does not include:

a global redefinition of state.visible for all state in the game
persistence migration of old save files
broad normalization of editor/balancer defaults for generic state.visible
expansion of blueprint patch payloads or unrelated live-edit workflows

Those are separate concerns and are excluded to keep the implementation within the stated task and project contract.

5. Design
   5.1 Storage bar resolution in the selection UI
   What changes

resolveStorageAbilityBars will stop consulting entry.visible.

Why

The current storage UI path is the direct source of the larder/wood-storage divergence. The authored storage config already compiles into display.bars; that is the contract the UI must follow.

How

For each candidate bar in resolved display data:

Resolve the resource key from the bar key.
Resolve the runtime state entry for that resource.
Require that the state entry is storage-shaped, using the existing storage metadata marker:
allowDeposit
allowWithdraw
priority
Do not read or filter on entry.visible.
Build the AbilityBarModel exactly as today, using current/max values and tooltip fields from the state entry.
Result

A storage entry with a compiled display bar will render and match the resource lens even if runtime state has visible: false.

The only way to hide authored storage is to compile without the storage bar.

5.2 Handler fix for omitted visibility
What changes

UpdateStateHandler and SetGlobalHandler will preserve existing visibility when visible is omitted.

Why

The current defaulting behavior silently changes visibility during unrelated updates. That is the root cause of visible-state drift for any long-lived state entry and must be fixed independently of the storage UI change.

How

For both handlers:

resolve the target entry
if the entry already exists:
update value and/or max as today
only update visible when the payload explicitly carries a boolean
if the entry does not exist:
create the entry with provided value and/or max
set visible to the explicit payload value when provided
otherwise initialize visible to false
Result

Existing visibility is stable under value/max mutations.

5.3 Deterministic storage compilation
What changes

A dedicated storage reconciliation pass will run once per compile, immediately before the storage ability loop in CompilerService.

Why

Storage artifacts are currently spread across state, tags, display, passive effects, and behavior rules. The storage compiler itself is only additive/overwriting in-place. A pre-pass is required so current authored storage config fully determines the compiled result.

How

Add a new internal compiler helper:

File: src/engine/compiler/abilities/storageCompilerReconciler.ts
Function: reconcileStorageCompilerArtifacts(draft: Blueprint, configs: StorageAbilityConfig[]): void

This helper mutates the draft in place.

5.3.1 Detection rules

A compiled state entry is treated as a storage-owned state entry iff:

it is a non-array object, and
it has at least one of these own-properties:
allowDeposit
allowWithdraw
priority

This detection rule must be used consistently. No alternative marker is introduced.

5.3.2 Cleanup resource set

The reconciler computes:

authoredResources: trimmed non-empty resource names from current storage configs
compiledStorageResources: resource keys in components.state whose entries satisfy the storage-owned detection rule
cleanupResources = union(authoredResources, compiledStorageResources)

The reconciler runs even when configs is empty. That is required so removing all storage abilities removes previously compiled storage artifacts.

5.3.3 Artifacts removed per cleanup resource R

For each R in cleanupResources, the reconciler must remove:

State entries
components.state[R] when the current entry is storage-owned
any state key with these prefixes:
vals*storage*${R}_cap_
vals_entropy_${R}_
vals_entropy_tick_${R}_
auto_req_${R}_timer_
auto*req*${R}_need_

This covers storage capacity scaler temp state, entropy state, entropy tick state, and auto-request state.

Tags
top-level tag storage:${R}
Display bars
any display bar whose resolved state resource key is R and whose key is storage-owned by current storage compilation

Implementation rule: the reconciler removes bars by resource key match against R. Non-storage bars for other resources remain untouched.

Passive effects

Remove any passive effect that satisfies at least one of these exact conditions for R:

target or source is a string starting with:
self.state.vals*storage*${R}_cap_
self.state.vals_entropy_${R}_
self.state.vals_entropy_tick_${R}_
self.state.auto_req_${R}_timer_
self.state.auto*req*${R}_need_
target === self.state.${R}.max
op === SUB and:
target === self.state.${R}.value
source is a string starting with self.state.vals_entropy_tick_${R}\_

The contract here is explicit: for storage-owned resources, the storage compiler owns the capacity-scaling and entropy passive-effect pipeline for that resource.

Behavior rules

Remove any behavior rule whose id starts with:

sys*auto_req*${R}_need_
sys_auto_req_${R}_xfer_
sys*auto_req*${R}_xfer_cap_
5.3.4 Rebuild step

After reconciliation completes, CompilerService runs the existing storage ability loop unchanged:

each current storage config is compiled by storageCompiler
visible storage recreates its bar
hidden storage recreates state but no bar
entropy and auto-request are reintroduced only when currently authored
Result

Compile becomes deterministic for storage artifacts even when the input blueprint already contains old compiled storage output.

5.4 Test and fixture cleanup
What changes

Tests that currently encode obsolete hidden-storage assumptions will be updated to reflect the new contract.

Why

Those tests are about transfer and entropy behavior, not storage visibility. They should not continue asserting or constructing state that contradicts the authored storage contract.

How

Update the affected test fixtures so storage state uses current authored semantics and visibility is not used as a hidden-storage proxy.

6. File-by-file implementation plan
   6.1 Add: src/engine/compiler/abilities/storageCompilerReconciler.ts

Responsibility
Own all pre-compilation cleanup for storage-generated artifacts.

Logic
Implements the detection, cleanup set, and exact removal rules defined in section 5.3.

Interface
Single exported function:

reconcileStorageCompilerArtifacts(draft: Blueprint, configs: StorageAbilityConfig[]): void

No other module calls this except CompilerService.

6.2 Change: src/engine/compiler/CompilerService.ts

Responsibility
Orchestrate compile order.

Logic
Immediately before the storage configs loop:

compute storageConfigs = abilities.storage ?? []
call reconcileStorageCompilerArtifacts(draft, storageConfigs)
then execute the existing storage compile loop

The call is unconditional, including the zero-storage case.

Interface
No signature change.

6.3 Add: src/engine/compiler/abilities/storageCompilerReconciler.test.ts

Responsibility
Behavior-level regression coverage for deterministic storage compilation.

Logic
Must cover these cases:

compile-on-compiled visible toggle:
Given a blueprint compiled once with storage visible
When authored storage is changed to hidden and compile runs again
Then the compiled blueprint has no storage bar for that resource
compile-on-compiled resource rename/removal:
Given a blueprint compiled with storage resource food
When authored storage changes to heat or is removed
Then old food storage artifacts are absent and only current artifacts remain
compile-on-compiled entropy/auto-request disable:
Given a blueprint compiled with entropy and auto-request enabled
When authored storage disables them and compile runs again
Then the generated state keys, passive effects, and rules are absent

Tests must assert behavior from compiled output, not helper internals. That matches the canonical testing standard.

6.4 Change: src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.ts

Responsibility
Resolve authored storage bars for UI display and lens matching.

Logic
Remove the entry.visible === false suppression branch. Keep the storage-shaped entry check.

Interface
No signature change.

6.5 Change: src/ui/runtime/world/selection/ability-display/resolveStorageAbilityBars.test.ts

Responsibility
Lock the new storage-visibility contract.

Logic
Update coverage to assert:

storage bars render from display bars even when state[resource].visible is false
non-storage bars are still ignored when storage metadata is absent
6.6 Change: src/ui/runtime/world/selection/selectionLensMap.resource.test.ts

Responsibility
Verify resource-lens matching follows storage bars, not runtime state visibility.

Logic
Add or update a case where:

the entity has a storage display bar
the storage-shaped state entry has visible: false
the resource lens still matches
6.7 Change: src/ui/runtime/world/selection/selectionLensMap.resource.flyweight.test.ts

Responsibility
Verify the same contract when display bars come from the blueprint rather than the entity.

Logic
Mirror the test above using blueprint-owned display data.

6.8 Change: src/ui/runtime/world/selection/ResourceCard.test.tsx

Responsibility
Keep UI-level behavior aligned with the storage contract.

Logic
Update fixtures so hidden storage is represented by bar absence, not by state.visible: false, and add/retain a case proving storage still renders when the display bar exists.

6.9 Change: src/ui/runtime/world/selection/ResourceCard.flyweight.test.tsx

Responsibility
Verify the same behavior when the bar is blueprint-owned.

Logic
No visibility suppression via runtime state.

6.10 Change: src/engine/runtime/handlers/UpdateStateHandler.ts

Responsibility
Apply UPDATE_STATE without inventing visibility changes.

Logic
Refactor entry creation/update so:

explicit visible overwrites
omitted visible preserves existing visibility
omitted visible initializes new entries as hidden

Interface
No command payload change.

6.11 Change: src/engine/runtime/handlers/UpdateStateHandler.test.ts

Responsibility
Regression coverage for omitted-visibility semantics.

Logic
Add cases for:

existing visible true entry + value update without visible => visibility stays true
existing visible false entry + max update without visible => visibility stays false
new entry + value update without visible => new entry is hidden
6.12 Change: src/engine/runtime/handlers/SetGlobalHandler.ts

Responsibility
Apply SET_GLOBAL without inventing visibility changes.

Logic
Mirror the UpdateStateHandler rule:

preserve existing visibility on omission
default new entries to hidden when omitted

Interface
No command payload change.

6.13 Add: src/engine/runtime/handlers/SetGlobalHandler.test.ts

Responsibility
Regression coverage for the SET_GLOBAL omission bug.

Logic
Add cases for:

existing visible true global entry + value update without visible => stays true
existing visible false global entry + value update without visible => stays false
new global entry without visible => hidden
6.14 Change: src/game/larderEntropy.integration.test.ts

Responsibility
Remove obsolete hidden-storage assumptions from an entropy test.

Logic
Use authored storage visibility consistent with the current storage contract. The test must continue to verify only entropy drain behavior.

6.15 Change: src/game/larderArrival.integration.test.ts

Responsibility
Remove obsolete hidden-storage assumptions from an arrival test.

Logic
Use storage state consistent with the current authored storage contract. The test must continue to verify transfer arrival and ledger clearing only.

6.16 Change: src/engine/runtime/RuntimePhases.arrival.test.ts

Responsibility
Same cleanup at runtime-phase integration level.

Logic
Do not use hidden storage visibility as a transfer fixture default.

7. Test plan

The design must be validated at three levels, matching the project’s required testing layers.

7.1 Unit
storageCompilerReconciler.test.ts
UpdateStateHandler.test.ts
SetGlobalHandler.test.ts
resolveStorageAbilityBars.test.ts
7.2 Integration
selectionLensMap.resource.test.ts
selectionLensMap.resource.flyweight.test.ts
larderEntropy.integration.test.ts
larderArrival.integration.test.ts
RuntimePhases.arrival.test.ts
7.3 View
ResourceCard.test.tsx
ResourceCard.flyweight.test.tsx

All tests must use Given/When/Then structure and assert externally observable behavior, per the canonical standard.

8. Acceptance criteria

The implementation is complete only when all of the following are true:

A storage entity with a compiled storage display bar is classified as resource even if state[resource].visible === false.
A storage entity without a compiled storage display bar is not classified as resource, even if state[resource].visible === true.
Recompiling an already-compiled blueprint after toggling storage visibility removes or restores the storage bar on the first compile.
Recompiling an already-compiled blueprint after removing/renaming storage removes stale storage state, tags, rules, and passive effects on the first compile.
UPDATE_STATE does not alter existing visibility unless visible is explicitly provided.
SET_GLOBAL does not alter existing visibility unless visible is explicitly provided.
Larder entropy and arrival tests no longer encode the old hidden-food assumption.
All affected tests are green, and the changes stay within the defined scope.
