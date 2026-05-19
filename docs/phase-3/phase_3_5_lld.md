Phase 3.5 LLD: Smart Behavior Logic Updates

1. Objective

Refine the Behavior Editor's autocomplete engine to address three specific UX/Logic deficiencies:

Visibility Control: Only show suggestions when the input is focused.

Deep Introspection: Support dot-notation drilldown into entities (e.g., self.state.wood).

Type Safety: Context-sensitive operator suggestions based on the resolved type of the preceding token.

2. Feature 1: Autocomplete Visibility (Focus Guard)

The Problem

Currently, the suggestion box renders whenever suggestions.length > 0, regardless of whether the user is actively typing in that specific input. This causes UI clutter.

Implementation Strategy

We will decouple "suggestion availability" from "suggestion visibility".

Component: SmartInput.tsx

State Changes:

Add const [isFocused, setIsFocused] = useState(false);

Logic Flow:

Focus: onFocus={() => setIsFocused(true)} triggers visibility.

Blur: onBlur={() => setIsFocused(false)} hides visibility.

Interaction Guard (CRITICAL):

The SuggestionBox items MUST use onMouseDown={(e) => e.preventDefault()}.

This prevents the browser from shifting focus away from the input when clicking a suggestion, ensuring the onBlur event on the input does not fire prematurely.

Do not use timeouts for blur handling; they are race-condition prone.

Rendering Condition:

const showSuggestions = isFocused && suggestions.length > 0;
// ...
{showSuggestions && <Popover ... />}

3. Feature 2: Entity Drilldown & Introspection

The Problem

The current engine stops at entities (e.g., self). It does not suggest properties (.state, .wood) because it views self as a terminal value.

Implementation Strategy

Implement a recursive schema walker that resolves paths against the ModuleCartridge and the active DraftBlueprint.

New Utility: src/ui/devtools/editors/behaviors/autocomplete/schemaIntrospection.ts

Types:

export type ResolvedType = "number" | "string" | "boolean" | "object" | "unknown";

export interface SchemaNode {
type: ResolvedType; // The semantic type of the value
children?: string[]; // Keys available for drilldown (if any)
}

Function: resolvePath

Signature: (module: ModuleCartridge | null, draft: Blueprint | null, path: string) => SchemaNode

Algorithm:

Root Resolution:

self: Returns the DraftBlueprint schema structure.

global: Returns the sys_world state schema.

entity_id: Look up Blueprint in ModuleCartridge.

Path Traversal:

Split path by ..

For each segment, walk the Zod schema (unwrapping optional, nullable).

The GameValue Special Case:

If the schema resolves to the GameValue structure ({ value, max, min }):

Type: Return type: "number" (allows arithmetic/comparison).

Children: Return children: ["value", "max", "min"] (allows drilldown).

This creates a "Dual Nature" node that satisfies both operator suggestions and drilldown suggestions.

4. Feature 3: Type-Safe Comparison Operators

The Problem

The engine suggests numeric operators (>, <) for non-numeric fields (e.g., isStatic boolean), creating invalid logic rules.

Implementation Strategy

Use the resolved SchemaNode from Feature 2 to filter the list of suggested operators.

Updates: behaviorStateMachine.ts

Logic Flow Update:
When the previousToken is identified as a Reference/Path:

Call resolvePath with the token string to get the SchemaNode.

Generate suggestions based on both properties of the node:

A. Drilldown Check:

If node.children exists and is not empty:

Suggest . (Dot).

B. Operator Check (Switch on node.type):

number:

Suggest: =, !=, >, <, >=, <=

Suggest: Arithmetic operators +, -, \*, / (if context implies expression).

string / boolean / enum:

Suggest: =, !=

Do NOT suggest >, <.

object:

Do NOT suggest comparison operators (unless it also has a primitive mapping, essentially handled by GameValue case).

unknown:

Fallback: Suggest = (Equality is usually safe).

Suggestion Metadata:
The Suggestion interface should define type: "operator".

5. Grammar & Bounds (Immutable Constraints)

1. Sentence Start:

All sentences MUST start with WHEN (for Triggers) or IF (for Logic/Flow conditionals).

Rule: "First words are ALWAYS WHEN|IF".

Implementation: The tokenizer/state machine must enforce this. If the input is empty, suggest only WHEN and IF.

2. The DO Boundary:

DO is an obligatory boundary word separating Condition from Effect.

Grammar: WHEN <condition> DO <effect>

This provides a clear mental model for designers.

6. Testing Strategy

6.1 Logic Tests (schemaIntrospection.test.ts)

Draft Resolution: Verify self.state resolves keys from the unsaved draft.

Deep Nesting: Test a 3-level path (e.g. self.components.physics.radius).

GameValue Duality: Verify state.hp (GameValue) returns { type: "number", children: ["value"...] }.

6.2 State Machine Tests (behaviorStateMachine.test.ts)

Start State: Empty input should only suggest WHEN, IF.

Type Safety:

WHEN self.state.hp (number) -> Suggests >, < AND ..

WHEN self.label (string) -> Suggests =, !=, does not suggest <.

Boundary Enforcement: WHEN self.hp > 10 -> Suggests DO (and AND).

6.3 Integration Tests (SmartInput.test.tsx)

Focus Management:

Focus input -> Suggestions appear.

Blur input (click outside) -> Suggestions disappear.

Click suggestion -> Verify onMouseDown prevents focus loss, input updates.

7. Execution Plan

Update schemaIntrospection.ts: Implement the schema walker and the GameValue duality logic.

Update behaviorStateMachine.ts:

Enforce WHEN/IF start suggestions.

Implement DO transition logic.

Inject resolvePath logic into the isReferenceToken check and filter the returned operator list.

Refactor SmartInput.tsx: Add isFocused state and implement the onMouseDown focus guard pattern.
