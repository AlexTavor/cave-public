Low-Level Design: Phase 3 Unified Behavior System

Status: Revised (Post-Review)
Context: Phase 3 Refactor
Scope: Editor Architecture & UX

Overview

This document details the implementation of the Unified Behavior System. The objective is to replace the fragmented Logic/Trigger/Flow editors with a single "Behaviors" interface.

To bridge the gap between the user's intent (linear grammar) and the ECS schema (structured data), we introduce a Transformer Layer within the Editor. This layer handles the serialization and parsing of rules, ensuring that linear input like WHEN hp < 10 SPAWN potion is correctly stored as a structured TriggerRule without corrupting the ECS.

Core Concepts

2.1 The Unified Grammar

We move to a verb-first model handled by a unified UI:

Trigger (Event): WHEN [Condition] DO [Effect]

Logic (Continuous): SET [State] = [Expression]

Flow (Transport): GIVE [Resource] TO [Target]

2.2 The Facade & Transformer

Facade: Aggregates rules from TriggerComponent, LogicComponent, and FlowComponent into a single view.

Transformer: A pure function layer responsible for converting between the UI's linear VirtualRule format and the heterogeneous ECS storage formats.

Schema & Data Model

3.1 Logic Schema Expansion

File: src/data/schemas/logic.ts

Add verbs: GIVE, TAKE, SPAWN, KILL, MORPH, TELL, LOG, PAUSE.

3.2 Flow Component Schema

File: src/data/schemas/components.ts

Add rules property to FlowComponentSchema.

export const FlowComponentSchema = z.object({
inputs: z.array(EffectSchema).optional(),
outputs: z.array(EffectSchema).optional(),
controls: z.object({ /_ ... _/ }).optional(),
rules: z.array(LogicRuleSchema).default([]), // New: Supports GIVE/TAKE rules
});

The Behavior Transformer (State Logic)

This is the critical translation layer preventing schema mismatch errors.

File: src/ui/devtools/editors/blueprint/behaviors/behaviorTransformer.ts

4.1 Rule Serialization (ECS $\rightarrow$ UI)

The UI expects a flat array of tokens. The Transformer must flatten structured data.

Logic/Flow Rules: Direct mapping (they are already linear LogicRule objects).

Trigger Rules:

Input: TriggerRule { condition: { tokens: A }, effects: [{ type: 'SPAWN', ... }] }

Output: ['WHEN', ...A, 'SPAWN', ...payload]

Note: The transformer must reverse-map TriggerEffect objects back to tokens.

4.2 Rule Parsing (UI $\rightarrow$ ECS)

When saving a rule, the Transformer identifies the intent and converts tokens to the target schema.

Algorithm:

Identify Verb: Check first token.

WHEN $\rightarrow$ Trigger

GIVE, TAKE $\rightarrow$ Flow

SET, ADD, etc. $\rightarrow$ Logic

Routing:

Logic/Flow: Save tokens directly as a LogicRule object with id.

Trigger:

Split tokens into Condition (between WHEN and Effect Verb) and Effect (Effect Verb + args).

Construct TriggerRule object:

{
id: ruleId,
condition: { tokens: conditionTokens },
effects: [ parseEffectTokens(effectTokens) ]
}

Validation:
If parseEffectTokens fails (e.g. unknown effect verb), the rule remains in a "Draft/Error" state in the UI or fails gracefully, preventing save corruption.

The Behavior Facade Hook

File: src/ui/devtools/editors/blueprint/behaviors/useEntityBehaviors.ts

Responsibilities:

Read: Memoize and merge:

draft.components.logic.rules

draft.components.flow.rules

draft.components.trigger.rules (mapped via Transformer)

Write (CRUD):

Stable Identity: Rules must be tracked by UUID, not index.

Migration: If a user changes a verb (e.g., SET $\rightarrow$ WHEN), the hook:

Removes the rule from LogicComponent (using ID).

Transforms the tokens.

Adds the new rule to TriggerComponent.

Safe Garbage Collection:

Violation Fix: Never delete a component just because rules is empty.

Logic: Delete LogicComponent only if rules.length === 0 AND tier === 'entity' (default).

Flow: Delete FlowComponent only if rules.length === 0 AND !inputs AND !outputs AND !controls.

Trigger: Delete TriggerComponent if rules.length === 0 (Trigger has no other properties).

Runtime Support

We must ensure the runtime executes the new verbs.

6.1 Flow System

File: src/engine/runtime/systems/FlowSystem.ts

Responsibility:
Currently, FlowComponent is passive (inputs/outputs are processed by transfers). We need an active system to evaluate FlowComponent.rules.

Logic:

Iterate entities with flow.rules.

Evaluate GIVE / TAKE rules using JsonLogicAdapter.

Operation Mapping:

GIVE target resource amount: Emits RuntimeCommand.TRANSFER.

TAKE: Emits transfer (reversed).

6.2 JsonLogic Adapter Updates

File: src/engine/logic/JsonLogicAdapter.ts

Register operations for GIVE and TAKE (returning logic data that the System interprets, or side-effects if architectural pattern permits).

Correction: Ideally, JsonLogic remains side-effect free. The FlowSystem should evaluate the rule, and if truthy/executable, the System emits the Command.

Revised Approach: FlowComponent.rules are likely "Action Rules" (always execute?). Or conditional?

Assume: IF [condition] GIVE [resource].

Adapter evaluates condition. System executes action.

UI Components

7.1 BehaviorCard

File: src/ui/devtools/editors/blueprint/behaviors/BehaviorCard.tsx

Replaces the separate cards.

Uses useEntityBehaviors hook.

Renders a list of BehaviorItem.

7.2 BehaviorInput

File: src/ui/devtools/editors/blueprint/behaviors/BehaviorInput.tsx

Enhanced StructuredSentenceInput.

First-token autocomplete provides context-aware categories:

Event: WHEN

Logic: SET, ADD, SUB

Flow: GIVE, TAKE

File Manifest

src/ui/devtools/editors/blueprint/behaviors/
├── types.ts // VirtualRule definition
├── behaviorTransformer.ts // Logic <-> Trigger serialization
├── useEntityBehaviors.ts // Facade Hook
├── BehaviorCard.tsx // Main UI
├── BehaviorList.tsx
├── BehaviorItem.tsx
├── BehaviorInput.tsx
└── **tests**/
├── behaviorTransformer.test.ts
└── useEntityBehaviors.test.tsx

src/engine/runtime/systems/
└──
