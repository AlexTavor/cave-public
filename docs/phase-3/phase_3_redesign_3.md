Phase 3.5 Low-Level Design: Behavior Editor Autocomplete Engine

1. Overview

This document details the implementation plan for the "Smart Input" overhaul in the Behavior Editor. The goal is to transform the naive, append-only autocomplete into a context-aware, type-safe, and cursor-sensitive engine that supports deep property introspection (drilldown).

The "Why"

Clipping: Current suggestions are clipped by the editor's overflow: hidden containers.

Drilldown: Users cannot discover properties like self.state.wood without typing them blind.

Type Safety: The engine suggests numeric operators (<, >=) for non-numeric types.

UX Friction: Suggestions appear when the input is not focused, and selecting one appends to the end of the string instead of replacing the token at the cursor.

The "How"

We will implement a layered architecture:

Presentation: A Portal-based Popover to escape clipping and a refactored SmartInput that tracks focus and cursor position.

Introspection: A schema walker that resolves Zod types for dot-notation paths (entity.state.key).

State Machine: A grammar-aware engine that transitions between states (Verb -> Entity -> Path/Operator -> Value) based on the token at the cursor.

2. Architecture & Data Flow

graph TD
User[User Input] --> SmartInput
SmartInput -->|Cursor & Value| useBehaviorAutocomplete

    useBehaviorAutocomplete --> Tokenizer
    useBehaviorAutocomplete -->|Token Context| BehaviorStateMachine

    BehaviorStateMachine -->|Previous Token| SchemaIntrospection
    SchemaIntrospection -->|Resolve Type & Children| ModuleData

    SchemaIntrospection -->|Type Info| BehaviorStateMachine
    BehaviorStateMachine -->|Suggestions| useBehaviorAutocomplete

    useBehaviorAutocomplete -->|Filtered Suggestions| SmartInput
    SmartInput -->|Render| Popover

3. Component Specifications

3.1 src/ui/lib/atoms/popover/Popover.tsx (New)

Responsibility:
A headless wrapper around @floating-ui/react to render content in the float portal layer, ensuring it floats above all other UI elements (escaping clipping).

Interface:

interface PopoverProps {
/** The element to anchor the popover to \*/
triggerRef: React.RefObject<HTMLElement | null>;
/** Whether the popover is visible _/
isOpen: boolean;
/\*\* The content to render inside the portal _/
children: React.ReactNode;
/\*_ Placement preference _/
placement?: "top-start" | "bottom-start";
}

Implementation Details:

Uses useFloating with autoUpdate, flip, shift, and offset.

Renders into <Portal layer="float">.

Crucial: Must ensure pointer events in the portal do not steal focus immediately, or handle onMouseDown in children to prevent blur.

3.2 src/lib/terminal/components/SmartInput.tsx (Refactor)

Responsibility:
Handles text input, cursor tracking, focus state, and token replacement.

Key Changes:

Focus Tracking: Add isFocused state.

onFocus={() => setIsFocused(true)}

onBlur={() => setIsFocused(false)} (with timeout/check to allow clicking suggestions).

Cursor Awareness:

Track selectionStart in onSelect and onKeyUp/onClick.

Pass cursor position to useBehaviorAutocomplete.

Token Replacement:

Instead of appending to end, locate the token boundary around the cursor.

Replace only that token range with the selected suggestion.

Preserve text before/after the token.

Interface:

// Existing props, plus:
interface SmartInputProps {
// ...
onCursorChange?: (cursor: number) => void;
}

3.3 src/ui/devtools/editors/behaviors/autocomplete/schemaIntrospection.ts (New)

Responsibility:
Resolves a dot-notation path string into schema information (children keys and resolved type) by traversing the ModuleCartridge and DraftBlueprint.

Interface:

interface IntrospectionResult {
/\*\* _ The resolved Zod type of the path (e.g. 'number', 'string', 'object').
_ Returns 'unknown' if path is invalid.
\*/
type: string;

    /** * If the path resolves to an object, these are its keys.
     * (e.g. self.state -> ['hp', 'xp'])
     */
    children: string[];

}

export function resolvePath(
module: ModuleCartridge | null,
draft: Blueprint | null,
path: string // e.g. "self.state.wood"
): IntrospectionResult;

Logic:

Root Resolution:

self -> Draft Blueprint.

global -> World State (sys_world).

entity_id -> Blueprint from Module.

Traversal:

Split path by ..

Walk the Zod schema tree (unwrap optional, nullable, etc.).

Use getObjectShape (existing util) to find children.

GameValue Handling:

If a node is a GameValue (complex object { value: number, ... }), treat it as its value type (number) for operator suggestions, but allow drilling into it if needed.

3.4 src/ui/devtools/editors/behaviors/autocomplete/behaviorStateMachine.ts (New)

Responsibility:
Determines what to suggest based on the current cursor context and grammar rules.

Interface:

interface BehaviorStateMachineInput {
tokens: string[];
cursorIndex: number; // Which token index is the cursor currently on/after?
moduleData: ModuleCartridge | null;
draft: Blueprint | null;
}

export function behaviorStateMachine(
input: BehaviorStateMachineInput
): Suggestion[];

State Logic:

Start (Token 0): Suggest Verbs (WHEN, SET, GIVE, TAKE).

After WHEN: Suggest Entities (self, global, entity_ids).

After Entity/Path:

Call resolvePath(token).

If type === 'object': Suggest . (drilldown operator) + children keys.

If type === 'number': Suggest Arithmetic/Comparison Operators (>, <, =, +, -).

If type === 'string'/'enum': Suggest Equality Operators (=, !=).

After Operator: Suggest Values or Entities.

After Effect Verb (GIVE): Suggest Numbers (Amount).

3.5 src/ui/devtools/editors/behaviors/autocomplete/useBehaviorAutocomplete.ts (New)

Responsibility:
The wiring hook that connects the UI state (input, cursor) to the logic engine.

Flow:

Receive input and cursor from SmartInput.

Tokenize input (using existing tokenizeSentence or a robust cursor-aware tokenizer).

Identify the activeToken (the one the cursor is touching).

Call behaviorStateMachine.

Filter results based on the activeToken (fuzzy match).

Return Suggestion[].

Interface:

export const useBehaviorAutocomplete = (
input: string,
cursor: number
): Suggestion[];

4. Testing Strategy

4.1 Unit Tests (schemaIntrospection.test.ts)

Draft Access: Verify self.state resolves keys from the unsaved draft, not just the persisted module.

Deep Nesting: Verify entity.components.physics.radius resolves to number.

Invalid Paths: Verify self.invalid.prop returns type unknown and empty children.

4.2 Unit Tests (behaviorStateMachine.test.ts)

Type Safety:

WHEN self.state.hp (number) -> Suggests >, <.

WHEN self.label (string) -> Suggests =, !=, does not suggest <.

Drilldown:

WHEN self -> Suggests .state, .display.

WHEN self. -> Suggests state, display (filtered).

4.3 Integration Tests (SmartInput.test.tsx)

Portal Rendering: Verify suggestions render outside the clipped container.

Inline Editing:

Text: GIVE wood TO chest

Cursor in wood.

Select stone.

Result: GIVE stone TO chest.

Focus Preservation: Verify clicking a suggestion does not close the popover prematurely (before selection logic runs).
