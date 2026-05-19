High-Level Design: Simulation Fidelity & Editor Enhancements

This document outlines the architectural plan for Phase 4, Steps 1 & 2, incorporating specific requirements for Transport Reversal and Mutable Behavior Editing.

1. The Ledger System (Simulation Fidelity)

Objective: Decouple "resource awareness" from "resource possession." Entities must be able to react to incoming resources before they physically arrive, eliminating logic spam and race conditions during transport latency.

1.1 Data Model Extensions (Runtime)

We will extend the ephemeral RuntimeEntity type. This data is transient (not saved to disk) and exists only during the runtime lifecycle to track in-flight assets.

File: src/engine/runtime/types.ts

Change: Add ledger property.

export interface RuntimeEntity {
// ... existing fields
ledger?: {
// Resources currently traveling TOWARDS this entity
incoming: Record<string, number>;
};
}

1.2 Transport Lifecycle Updates

We must intercept every resource movement command to keep the ledger in sync with the physics world.

A. Initiation (TransferHandler.ts)

Trigger: TRANSFER_ASSETS command.

Logic:

Spawn transfer entity (Physics body).

Resolve target entity in World.

Initialize target.ledger if missing.

Increment target.ledger.incoming[resource] by payload amount.

B. Completion (ResolveTransferHandler.ts)

Trigger: RESOLVE_TRANSFER command (Physical Arrival).

Logic:

Resolve the actual receiver (if status === 'returning', receiver is sourceId, else targetId).

Decrement receiver.ledger.incoming[resource] by payload amount.

Apply resource to receiver.state (Existing logic).

C. Cancellation via Reversal (CancelTransferHandler.ts)

Requirement: Transport nodes must physically "turn around" rather than despawning/respawning.

Trigger: CANCEL_TRANSFER command.

Updates:

Identify Entities:

Transport: The moving entity.

OldTarget: Where it was going.

OldSource: Where it came from (now the new destination).

Ledger Swap:

Decrement OldTarget.ledger.incoming.

Increment OldSource.ledger.incoming.

Component Update:

Update Transport.transfer component:

status -> 'returning'

targetId -> OldSource.id

sourceId -> OldTarget.id (Swap source/target references for correctness).

Physics Update:

Call impulseEngine.setTarget(transportId, OldSource.id).

Result: The steering behavior immediately vectors the entity towards the new destination without destroying the physics body.

1.3 Logic Adapter Integration

File: src/engine/logic/JsonLogicAdapter.ts

Update: Ensure self.ledger.incoming.\* paths are resolvable.

Add safety check: if ledger is undefined on the entity, resolve path to 0.

2. Editor Tools: State & Behavior

Objective: Replace generic JSON forms with purpose-built editors and allow in-place modification of behavior rules.

2.1 The State Editor

File: src/ui/devtools/editors/fields/state-editor/StateEditor.tsx

Replace the generic SchemaForm for the state component with a tailored table view.

UI Structure:

Header: "Key", "Value", "Max", "Visible", "Actions".

Rows:

Key (Input, disabled if inherited/locked, strictly lowercase/snake_case).

Value (Number Input).

Max (Number Input, optional).

Visible (Checkbox).

Delete (Button).

Footer: "Add State Variable" row.

Validation: Prevent duplicate keys in the draft.

2.2 Mutable Behavior Editing

Requirement: Behavior rules must be editable in place (click-to-edit) rather than delete-and-recreate.

A. Component Architecture (BehaviorCard.tsx)

State: isEditing (boolean).

View Mode:

Displays the compiled sentence (e.g., WHEN hp < 10 DO ...).

Buttons: Edit (enters edit mode), Remove.

Edit Mode:

Renders <BehaviorInput /> initialized with the current rule sentence.

Auto-Focus: Input focuses immediately on mount.

Events:

onBlur: Commits the change if valid, or reverts if empty.

onKeyDown(Enter): Commits the change.

onKeyDown(Escape): Reverts to View Mode without saving.

B. Data Hook (useEntityBehaviors.ts)

New Action: updateBehavior(item: BehaviorItem, newSentence: string).

Logic:

Parse newSentence into tokens.

Compile tokens into a new BehaviorRule object.

Preserve ID: Assign the original item.id to the new rule to maintain list stability and references.

Update Draft: Replace the rule in draft.components.behavior.rules matching the ID.

Implementation Plan Summary

Runtime Types: Add ledger to RuntimeEntity.

Ledger Handlers: Implement increment/decrement logic in Transfer and Resolve handlers.

Reversal Logic: Rewrite CancelTransferHandler to mutate transfer components and update physics targets instead of respawning.

State Editor: Build StateEditor.tsx and hook into ComponentList.tsx.

Behavior Mutability: Update useEntityBehaviors with update logic; refactor BehaviorCard to support toggleable edit state.
