Low-Level Design: Phase 3 Unified Behavior System

Status: Final (Mitigated)
Context: Phase 3 Refactor
Scope: Editor Architecture, Data Model, Runtime Contracts

Overview

This document specifies the implementation details of the Unified Behavior System. The objective is to replace the fragmented Logic/Trigger/Flow editors with a single "Behaviors" interface.

Remediation Note: This design incorporates strict grammar definitions, backward-compatible schema parsers (using z.preprocess), and a pre-compilation strategy for Flow rules to ensure runtime stability and prevent "sortKey" crashes.

Core Concepts

2.1 The Unified Grammar (User Model)

Users interact with a flat "Sentence".
Grammar: [VERB] [SUBJECT/CONDITION] [OBJECT/EFFECT]

2.2 The Facade Pattern (System Model)

The editor presents a unified list of these sentences. Behind the scenes, the Behavior Facade routes these sentences to the correct storage component based on the leading Verb.

WHEN -> TriggerComponent.rules (Event-driven)

SET -> LogicComponent.rules (Continuous State)

GIVE -> FlowComponent.rules (Continuous Flow)

2.3 Grammar & Argument Mapping Specification

To prevent parsing ambiguity, we define strict EBNF-style grammar and argument mapping for the Commit-Time Compiler.

A. Mutation (Logic)

Grammar: SET <ref> <op> <value> [IF <condition>]

Verbs: SET, ADD, SUB, MULT, DIV

Mapping: Maps directly to LogicRule tokens. IF implies a conditional logic block.

B. Flow (Transport)

Grammar: GIVE|TAKE <amount> <resource> TO|FROM <target>

Verbs: GIVE, TAKE

Mapping (to FlowRule.compiled):

op: "GIVE" or "TAKE"

amount: Number(token[1])

resource: String(token[2])

target: String(token[4])

C. Trigger (Event)

Grammar: WHEN <condition_expr> <effect_verb> <effect_args...>

Verbs: WHEN

Effect Mapping (Example: TRANSFER):

Input: ... GIVE <amount> <resource> TO <target>

Schema: TriggerEffectSchema

Mapping:

type: "TRANSFER"

sourceId: "self" (implicit)

targetId: <target> token

payload: { [<resource>]: Number(<amount>) }

<!-- end list -->

Schema & Data Model

We update schemas to support stable ordering, backward compatibility, and pre-compiled flow rules.

3.1 Robust Schema Definitions (Backward Compatibility)

Existing data lacks sortKey. We use z.preprocess to inject it on load, preventing crashes.

File: src/data/schemas/logic.ts

import { ulid } from "ulid";

export const LogicRuleSchema = z.preprocess(
(val) => {
if (typeof val === 'object' && val !== null && !('sortKey' in val)) {
return { ...val, sortKey: ulid() }; // Inject if missing
}
return val;
},
z.object({
id: z.string().default(() => nanoid()),
sortKey: z.string(), // Strictly required after preprocess
tokens: z.array(LogicTokenSchema).default([]),
compiled: z.unknown().optional(),
})
);

File: src/data/schemas/components.ts

Trigger Component:

export const TriggerRuleSchema = z.preprocess(
(val) => {
if (typeof val === 'object' && val !== null && !('sortKey' in val)) {
return { ...val, sortKey: ulid() };
}
return val;
},
z.object({
id: z.string().default(() => nanoid()),
sortKey: z.string(),
condition: LogicRuleSchema,
effects: z.array(TriggerEffectSchema).default([]),
})
);

Flow Component (Pre-Compiled):
We separate the Editor view (tokens) from the Runtime execution data (compiled) to avoid parsing strings in the tick loop.

export const FlowRuleCompiledSchema = z.object({
op: z.enum(["GIVE", "TAKE"]),
amount: z.number(),
resource: z.string(),
target: z.string(),
});

export const FlowRuleSchema = z.preprocess(
(val) => {
if (typeof val === 'object' && val !== null && !('sortKey' in val)) {
return { ...val, sortKey: ulid() };
}
return val;
},
z.object({
id: z.string().default(() => nanoid()),
sortKey: z.string(),
tokens: z.array(LogicTokenSchema).default([]), // For Editor display
compiled: FlowRuleCompiledSchema, // For Runtime execution
})
);

export const FlowComponentSchema = z.object({
rules: z.array(FlowRuleSchema).default([]),
// Deprecated fields (kept for migration detection)
inputs: z.array(z.unknown()).optional(),
outputs: z.array(z.unknown()).optional(),
});

The Behavior Facade & Compiler

This subsystem sits in the Editor layer (src/ui/devtools/editors/hooks/useEntityBehaviors.ts).

4.1 Types: EditorVerb vs LogicToken

To prevent runtime crashes in JsonLogicAdapter, we strictly separate Editor Verbs from Runtime Logic tokens.

export type EditorVerb = "WHEN" | "SET" | "ADD" | "SUB" | "MULT" | "DIV" | "GIVE" | "TAKE";

// LogicToken remains standard (no GIVE/TAKE/WHEN)
// src/data/schemas/logic.ts
export const LogicKeywordSchema = z.enum(["IF", "AND", "OR", "NOT"]); // Standard keywords only

4.2 The Commit-Time Compiler

When a user commits a rule, the compiler transforms the flat EditorVerb-led sentence into the schema-compliant component structure.

Parser Logic:

Identify Verb: Check tokens[0].

Route & Transform:

Case A: WHEN (Trigger)

Target: TriggerComponent.rules

Action: Strip WHEN. Parse tokens into condition (LogicRule) and effects (TriggerEffect[]) using the mapping spec in Section 2.3.

Case B: SET/ADD (Logic)

Target: LogicComponent.rules

Action: Map directly. Editor verbs like ADD may need mapping to + operator tokens if not natively supported by LogicToken.

Case C: GIVE/TAKE (Flow)

Target: FlowComponent.rules

Action:

tokens: Store full token array (including GIVE/TAKE) for UI.

compiled: Extract amount, resource, target into the FlowRuleCompiledSchema object.

4.3 Migration Strategy (Read-Time)

When the Facade loads an entity, it performs a Read-Time Migration for legacy Flow components to avoid data loss.

Check: Does FlowComponent have inputs or outputs?

Migrate:

Convert inputs (Effects) -> TAKE rules.

Convert outputs (Effects) -> GIVE rules.

Merge: Add these new rules to the rules array in the Draft state.

Cleanup: Clear inputs and outputs in the Draft state so subsequent saves persist the new format.

Runtime Execution Strategy

5.1 Logic System (Existing)

Input: LogicComponent.rules

Mechanism: Evaluates JsonLogic. Emits UPDATE_STATE.

5.2 Trigger System (Existing)

Input: TriggerComponent.rules

Mechanism: Evaluates condition. On rising edge, processes effects array.

5.3 Flow System (New)

File: src/engine/runtime/systems/FlowSystem.ts

Responsibility: Continuous Resource Transfer.

Input: FlowComponent.rules

Mechanism:

DOES NOT parse tokens.

Iterates rules.

Reads rule.compiled (Strict Object).

Emits TRANSFER_ASSETS command every tick.

<!-- end list -->

Implementation Plan & File Manifest

6.1 Hooks & State

src/ui/devtools/editors/hooks/useEntityBehaviors.ts: The Facade. Handles aggregation, "Commit-Time Compiler", and Read-Time Migration.

6.2 Parser Utilities

src/ui/devtools/editors/behaviors/compiler.ts:

compileTrigger(tokens): Returns TriggerRule.

compileFlow(tokens): Returns FlowRule with compiled object.

compileLogic(tokens): Returns LogicRule.

6.3 UI Components

src/ui/devtools/editors/behaviors/BehaviorCard.tsx: Replaces Logic/Trigger/Flow cards.

src/ui/devtools/editors/behaviors/BehaviorList.tsx: Renders virtual list.

src/ui/devtools/editors/behaviors/BehaviorInput.tsx: Smart input with EditorVerb awareness.

6.4 Runtime Systems

src/engine/runtime/systems/FlowSystem.ts: New system using pre-compiled data.

<!-- end list -->

Test Plan

Compiler Unit Tests:

Verify GIVE 10 wood TO chest -> compiled: { op: 'GIVE', amount: 10, resource: 'wood', target: 'chest' }.

Verify WHEN hp < 10 GIVE 5 hp TO self -> TriggerEffect: { type: 'TRANSFER', payload: { hp: 5 } ... }.

Migration Tests:

Load an entity with legacy flow.outputs.

Verify it appears as a GIVE rule in the Behavior List.

Verify saving the module writes it to flow.rules and clears flow.outputs.

Runtime Tests:

Verify FlowSystem correctly reads compiled data and emits transfers without errors.

Verify JsonLogicAdapter does not crash on sortKey presence/absence.
