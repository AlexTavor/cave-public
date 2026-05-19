Phase 3.5 Redesign: Behavior Editor UX & Autocomplete Engine (Corrected)

Status: Approved for Execution
Context: Post-Phase 3 "Smart Input" Deficiencies
Objective: Solve the UI clipping issue via Portals and implement a schema-aware, grammar-driven autocomplete engine that supports cursor-aware editing and dot-notation paths.

1. Problem Analysis

1.1 The Visibility Problem (Clipping)

The current SuggestionBox is rendered directly within the SmartInput DOM hierarchy.

Root Cause: Editor panels (ToolFrame, BehaviorsPanel) enforce overflow: auto/hidden.

Consequence: Absolute positioned suggestions are clipped by ancestors.

Solution: Render suggestions into the PortalManager 'float' layer.

1.2 The Capability Gap (Shallow Autocomplete)

The current autocomplete is naive (append-only) and syntax-unaware.

Path Syntax Mismatch: The previous plan suggested :: for drilldown, but the Runtime/Compiler strictly requires dot notation (self.state.hp).

Cursor Ignorance: parts.pop() always modifies the end of the string, making inline editing impossible.

Grammar Blindness: It doesn't know that WHEN starts a condition or DO starts an effect.

2. Architecture & Design

2.1 UI Layer: Floating Popover

Portal Integration: Use the existing PortalManager (layer="float") to escape clipping.

Focus Management: Critical fix required for Portal interaction—clicking a portal element usually triggers a blur on the input. We must prevent this via e.preventDefault().

2.2 Logic Layer: The Autocomplete Engine

A dedicated sub-module src/ui/devtools/editors/behaviors/autocomplete/.

Tokenizer: REUSE src/ui/devtools/editors/behaviors/compiler/tokenizer.ts.

Grammar: REUSE constants from compiler/constants.ts.

Path Resolution: Must use dot notation (.) to traverse the Schema/Draft, matching JsonLogicAdapter expectations.

3. Detailed Implementation Specifications

3.1 src/ui/lib/atoms/popover/Popover.tsx (New)

Responsibility: Headless wrapper around @floating-ui/react.

Props: triggerRef, isOpen, children.

Behavior: Renders children into <Portal layer="float">.

3.2 src/lib/terminal/components/SmartInput.tsx (Refactor)

Cursor Awareness (CRITICAL):

Remove parts.pop() append-only logic.

Implement getTokenAtCursor(value, selectionStart) to identify the active token.

Replace only the active token range when a suggestion is selected.

Focus Safety:

Suggestion items must use onMouseDown={(e) => e.preventDefault()}. This prevents the input from losing focus when the user clicks a suggestion in the Portal.

3.3 src/ui/devtools/editors/behaviors/autocomplete/schemaIntrospection.ts (New)

Responsibility: Inspects ModuleCartridge + Draft Blueprint.

Syntax: Dot Notation Only.

Input: entity.state. -> Returns keys of state component.

Input: self. -> Returns state, props, etc.

API:

resolvePathSuggestions(module, draft, pathString): string[]

3.4 src/ui/devtools/editors/behaviors/autocomplete/behaviorStateMachine.ts (New)

Responsibility: Context-aware suggestion generation.

Logic:

If token 0 is empty -> Suggest WHEN, SET, GIVE...

If previous token is WHEN -> Suggest Entity IDs, self, global.

If previous token is a numeric path -> Suggest Operators (>, <).

Context: Requires access to ModuleCartridge (read-only) and DraftBlueprint (for unsaved changes).

3.5 src/ui/devtools/editors/behaviors/useBehaviorAutocomplete.ts (New)

Responsibility: Wiring Hook.

Flow:

Get inputRef.current.selectionStart.

Tokenize input.

Find active token index based on cursor position.

Pass context to behaviorStateMachine.

Return filtered Suggestion[].

4. Test Strategy

4.1 Unit Tests (schemaIntrospection.test.ts)

Draft Access: Given a draft with unsaved state hp, resolving self.state. must return ['hp'].

Dot Notation: Verify entity.nested.prop parsing works (no :: support).

4.2 Unit Tests (behaviorStateMachine.test.ts)

Grammar: WHEN -> [EntityIDs].

Operators: self.hp -> ['>', '<', '=', '!='].

Effects: ... DO -> ['GIVE', 'TAKE', 'SET'].

4.3 Integration Test (SmartInput.test.tsx)

Portal Rendering: Verify suggestions appear in document.body (outside container).

Inline Editing (CRITICAL):

Input: GIVE wood TO chest

Cursor placed inside wood.

Select suggestion stone.

Result must be GIVE stone TO chest (not GIVE wood TO chest stone).

Focus Preservation: Clicking a suggestion must not blur the input.

5. Execution Steps

Infrastructure: Create Popover and refactor SmartInput (Cursor logic + Portal safety).

Logic: Implement schemaIntrospection (Dot notation) and behaviorStateMachine.

Integration: Wire useBehaviorAutocomplete into BehaviorInput.

Verification: Run the new test suite specifically targeting inline editing and path resolution.
