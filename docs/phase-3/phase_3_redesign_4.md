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

Blur: onBlur must be handled carefully. If the user clicks a suggestion (which lives in a Portal), a standard blur event fires on the input before the suggestion's onClick fires.

Solution: Delay the blur handling or use onMouseDown on the suggestion items to prevent focus loss.

Implementation: onBlur={() => setIsFocused(false)} is safe ONLY IF the SuggestionBox items use onMouseDown={(e) => e.preventDefault()}.

Rendering Condition:

const showSuggestions = isFocused && suggestions.length > 0;
// ...
{showSuggestions && <Popover ... />}

Interface Updates:
No public API changes. Internal state handling only.

3. Feature 2: Entity Drilldown & Introspection

The Problem

The current engine stops at entities (e.g., self). It does not suggest properties (.state, .wood) because it views self as a terminal value.

Implementation Strategy

Implement a recursive schema walker that resolves paths against the ModuleCartridge and the active DraftBlueprint.

New Utility: src/ui/devtools/editors/behaviors/autocomplete/schemaIntrospection.ts

Responsibility:
Takes a dot-separated string and returns type information and available children.

Types:

export type ResolvedType = "number" | "string" | "boolean" | "object" | "unknown";

export interface SchemaNode {
type: ResolvedType;
children?: string[]; // Keys available for drilldown
}

Function: resolvePath
Signature: (module: ModuleCartridge, draft: Blueprint, path: string) => SchemaNode

Algorithm:

Root Resolution:

self: Returns the DraftBlueprint schema structure.

global: Returns the sys_world state schema.

entity_id: Look up Blueprint in ModuleCartridge.

Path Traversal:

Split path by ..

For each segment, walk the Zod schema (unwrapping optional, nullable).

GameValue Special Case: If the schema resolves to the GameValue structure ({ value, max, min }), transparently resolve to the type of the value field (usually number), but also expose its keys (value, max, min) as children for explicit access.

Output: Return the final node's type and its keys (if it's an object).

Integration (Behavior State Machine)

The state machine currently transitions Reference -> Operator.
It must now transition:

Reference (Object) -> Drilldown (DOT) OR Operator (if applicable).

Reference (Primitive) -> Operator.

4. Feature 3: Type-Safe Comparison Operators

The Problem

The engine suggests numeric operators (>, <) for non-numeric fields (e.g., isStatic boolean), creating invalid logic rules.

Implementation Strategy

Use the resolved type from Feature 2 to filter the list of suggested operators.

Updates: behaviorStateMachine.ts

Logic Flow Update:
When the previousToken is identified as a Reference/Path:

Call resolvePath with the token string.

Switch node.type:

number:

Suggest: =, !=, >, <, >=, <=

Suggest: Arithmetic operators +, -, \*, / (if context allows expression)

string / boolean / enum:

Suggest: =, !=

object:

Suggest: . (Drilldown)

Do not suggest comparison operators (unless object equality is supported, which is rare in this engine).

unknown:

Fallback: Suggest = (Equality is usually safe).

Suggestion Metadata:
The Suggestion interface should define type: "operator".

5. Execution Plan

Update schemaIntrospection.ts: Implement the GameValue transparent unwrapping logic.

Update behaviorStateMachine.ts: Inject resolvePath logic into the isReferenceToken check and filter the returned operator list.

Refactor SmartInput.tsx: Add isFocused state and ensure SuggestionBox items prevent default on mousedown.
