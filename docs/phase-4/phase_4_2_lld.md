Phase 4.2 Low-Level Design: Simulation Fidelity, Time Scaling & Editor Tools

1. Introduction

This document details the low-level design for implementing Phase 4, Step 2 of the CaveOS project. The focus is on three primary areas:

Simulation Fidelity (The Ledger System): Decoupling resource awareness from possession to fix race conditions during transport.

Time Scaling (Rate Independence): Decoupling game logic simulation speed from frame rate using Explicit Accumulation in milliseconds.

Hot Reloading: Enabling live editing of entity behaviors without restarting the simulation.

2. The Ledger System (Runtime)

2.1 Overview

The Ledger System introduces a transient data structure (ledger) to RuntimeEntity to track incoming resources. Transport logic is updated to modify this ledger at the start, end, and cancellation of transfers.

2.2 Data Model Changes

src/engine/runtime/types.ts

Responsibility: Define the extended RuntimeEntity interface.

Changes: Add the ledger property to RuntimeEntity.

export interface RuntimeEntity {
// ... existing fields
/\*_ Transient tracking for incoming resources _/
ledger?: {
incoming: Record<string, number>;
};
}

2.3 Handler Updates

src/engine/runtime/handlers/TransferHandler.ts

Responsibility: Initiate asset transfer and credit the target's ledger.

Logic:

Validate source, target, and resources (existing).

Debit source state (existing).

Spawn pending transfer entity (existing).

New: Resolve target entity.

New: Ensure target.ledger exists; target.ledger.incoming defaults to {}.

New: For each resource in payload, target.ledger.incoming[key] += amount.

src/engine/runtime/handlers/ResolveTransferHandler.ts

Responsibility: Finalize transfer, credit receiver state, and debit receiver ledger.

Logic:

Identify receiver (sourceId if returning, targetId otherwise).

Resolve receiver entity.

New: If receiver.ledger.incoming exists:

For each resource in payload, receiver.ledger.incoming[key] -= amount.

Critical: Clamp ledger value to 0 (safety against negative drift).

Credit receiver state (existing).

Despawn transfer entity (existing).

src/engine/runtime/handlers/CancelTransferHandler.ts

Responsibility: "Turn around" the transport entity physically and swap ledger credits.

Logic:

Identify transportEntity, oldTargetId, oldSourceId from the transfer component.

Resolve oldTarget and oldSource entities.

Ledger Swap:

If oldTarget exists, decrement its ledger.incoming by payload amount.

If oldSource exists, increment its ledger.incoming by payload amount.

Component Update: Mutate transportEntity.transfer:

status = 'returning'

targetId = oldSourceId

sourceId = oldTargetId

Physics Update: Call context.impulseEngine.setTarget(transportEntity.id, oldSourceId).

2.4 Logic Adapter

src/engine/logic/JsonLogicAdapter.ts

Responsibility: Efficiently expose entity data to the logic engine.

Logic:

Zero-Allocation Context: Pass context.self directly to the data object for jsonLogic.apply.

Ledger Safety: Rely on json-logic-js behavior where accessing a missing path (e.g., self.ledger.incoming.wood) returns null. In numeric comparisons, null coercing to 0 is accepted behavior.

3. Time Scaling (Explicit Accumulation)

3.1 Overview

Objective: Ensure game logic runs rate-independently without introducing floating-point errors into integer-based resources.

Mechanism: Explicit Accumulator Pattern. Instead of scaling action values automatically, we expose dt (in milliseconds) as a value in the evaluation context. Users accumulate dt into a state variable (e.g., progress) and trigger actions when thresholds are met.

3.2 Runtime Phases

src/engine/runtime/runtimePhases.ts

Responsibility: Calculate safe dt and distribute to systems.

Changes:

Pass dt (ms) to systemPhase as an integer.

Constraint: Do NOT convert to seconds for systemPhase.

Constraint: DO convert to seconds (dt / 1000) strictly for impulseEngine.tick (physics remains SI units).

3.3 Behavior System Context

src/engine/runtime/systems/BehaviorSystem.ts

Responsibility: Inject dt into the evaluation scope.

Changes:

Update tick signature: tick(snapshot: Snapshot, commands: CommandBuffer, dt: number): void.

Update globalsBuffer: Inject dt as a global value.

Logic: this.globalsBuffer['dt'] = dt; (reset every tick).

src/engine/runtime/systems/behavior/ValueResolver.ts

Responsibility: Resolve global.dt references.

Changes: Ensure resolveFromGlobals correctly handles the injected dt.

3.4 No Automatic Action Scaling

src/engine/runtime/systems/behavior/ActionExecutor.ts

Decision: We explicitly reject automatic scaling inside the executor.

Rationale: "Magic" scaling hides complexity and breaks integer math.

Usage Pattern:

User Rule: ALWAYS DO ADD self.state.charge global.dt

User Rule: WHEN self.state.charge >= 1000 DO ADD wood 1 AND SUB self.state.charge 1000

4. Hot Reloading (Live Patching)

4.1 Architecture

To support immediate feedback when editing blueprints, we introduce a Patching Pipeline. The Editor sends a command to the Runtime, which updates its internal definitions and live entities.

4.2 New Command: PATCH_BLUEPRINT

src/engine/runtime/types.ts

export enum RuntimeCommandType {
// ...
PATCH_BLUEPRINT = "PATCH_BLUEPRINT"
}

export interface PatchBlueprintCommandPayload {
blueprintId: string;
// We only send components for now, as that contains behavior/stats
components: Record<string, unknown>;
}

4.3 Runtime Handler

src/engine/runtime/handlers/PatchBlueprintHandler.ts

Responsibility: Update registry and live entities.

Logic:

Registry Update: Update context.cartridge.blueprints[blueprintId] with the new component data. This ensures future spawns use the new logic.

Live Patching:

Query entities where entity.blueprintId === blueprintId.

Iterate and merge the new components into the live entity using the Preservative Merge Strategy:

Behavior/Display: Hard Replace. Overwrite entity.behavior with blueprint.behavior.

State: Iterate keys in blueprint.state.

If key exists on liveEntity.state, SKIP (preserve live HP/Inventory).

If key is missing on liveEntity.state, ADD it (use default from blueprint).

4.4 Editor Integration

src/ui/devtools/editors/blueprint/components/toolbar-actions/SaveButton.tsx

Responsibility: Dispatch patch command on save.

Logic:

If runtime is active:

Construct PATCH_BLUEPRINT command with draft.components.

runtime.commands.enqueue(command).

5. Editor Tools: State Editor

5.1 Component Architecture

src/ui/devtools/editors/fields/state-editor/StateEditor.tsx

Responsibility: A filterable list editor for the state component.

Logic:

Data Source: useSessionStore selecting draft.components.state.

Render: Header (Filter Input, Add Input, Add Button) + List (StateRow).

Actions: add(key): Adds { value: 0, visible: true }.

src/ui/devtools/editors/fields/state-editor/StateRow.tsx

Responsibility: Render a single row for a state variable.

Logic:

Inputs: Key (Read-only text), Value (Number Input).

Actions: Delete button.

Updates: Debounced updates to useSessionStore.

5.2 Integration

src/ui/devtools/editors/blueprint/components/component-deck/ComponentList.tsx

Change:

Check if key === 'state'.

If yes, render <StateEditor /> instead of generic <SchemaForm />.

6. Mutable Behavior Editing

6.1 Data Hooks

src/ui/devtools/editors/hooks/useEntityBehaviors.ts

Responsibility: Provide Update operation.

New Export: updateBehavior(item: BehaviorItem, newSentence: string): void

Logic:

tokenizeSentence(newSentence) -> tokens.

compileBehaviorRule(tokens) -> newRule.

Critical: newRule.id = item.source.ruleId (Preserve ID to prevent list jumping).

Update draft: Replace rule at index matching ID.

6.2 UI Components

src/ui/devtools/editors/behaviors/BehaviorCard.tsx

Responsibility: Display rule OR edit form.

State:

isEditing (local boolean).

draftSentence (local string).

Logic:

View Mode: Render sentence + Edit Button.

Edit Mode: Render <BehaviorInput initialValue={item.sentence} />.

Save: Call onUpdate(item, draftSentence), set isEditing(false).

6.3 Integration

src/ui/devtools/editors/behaviors/BehaviorsPanel.tsx

Logic:

Pass updateBehavior down to <BehaviorList /> -> <BehaviorCard />.

7. Test Plan

7.1 Unit Tests (Vitest)

Ledger Logic:

Verify target.ledger.incoming increases/decreases on Transfer/Resolve/Cancel.

Ledger Safety: Verify ResolveTransfer clamps ledger values to 0 if a race condition tries to debit more than the current pending balance.

Time Scaling (Context):

Test BehaviorSystem puts dt into context.

Test ValueResolver resolves global.dt.

Hot Reload:

Test PatchBlueprintHandler updates an existing entity's behavior component in the world.

Test that PatchBlueprintHandler preserves existing state values (Preservative Merge).

7.2 Smoke Tests (Manual)

Ledger: Run game. Spawn tree. Watch wood transfer. Verify no errors.

Time Scaling:

Create Rule: ALWAYS DO ADD self.state.time global.dt

Run game. Watch time state increase by ~16 per tick.

Hot Reload:

Spawn an entity that does nothing.

Edit Blueprint: Add ALWAYS DO ADD self.state.count 1.

Click Save.

Verify: Entity starts counting immediately without reload.

8. Implementation Details & Constraints

This section clarifies specific implementation details to avoid ambiguity.

Patching Strategy:

For
