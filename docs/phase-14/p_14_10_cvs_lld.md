phase_14_10_cvs_editor_lld.md

Low-Level Design: CvsEditor Component

Phase: 14.10
Status: Approved
Context: AI Context Pack v1
Scope: Devtools UI - CvsEditor

1. Overview

This document specifies the implementation of the CvsEditor component.

Goal: Provide a text-based editing surface for .cvs (Cave Script) files that integrates with the project's SmartInput and CommandRegistry infrastructure to provide syntax highlighting, autocomplete, and session management.

Key Responsibilities:

Bind to the active ModuleSession for a given filename.

Initialize a local CommandRegistry for script-specific autocomplete.

Render the script content using the existing SmartInput component.

Dispatch updates to the session draft on text changes.

Handle Comments: Correctly highlight lines starting with # and suppress autocomplete within them.

Constraint: The editor delegates state management to the useModuleSession hook and autocomplete logic to the shared SmartInput primitives.

2. Component Design

2.1 src/ui/devtools/editors/file/CvsEditor.tsx

Purpose: The root view component for editing a Cave Script file.

Props:

filename: string (The VFS path of the file being edited)

Logic & Data Flow:

Session Binding:

Use useModuleSession(filename) to retrieve the current session state.

Guard: If session.isReady is false, render a loading state (e.g., standard LoadingIndicator or simple text).

State Resolution:

Access the raw script content from session.draft.scripts[filename].

Default: If the scripts object or the specific key does not exist, default to an empty string "".

Registry Initialization:

Instantiate a CommandRegistry using useMemo.

Population: Initialize it with script-specific CommandDefinition objects.

Strategy: Reuse the global RUNTIME_COMMANDS from src/ui/runtime/terminal/runtimeRegistry.ts as the baseline for script commands.

Smart Input Integration:

Use the useSmartInput hook:

initialValue: The content from the session.

registry: The registry created above.

State Synchronization:

On mount (or when session.isReady becomes true), set the local input state of the hook to match the session draft content.

Note: Unlike the terminal which clears after submit, this is a persistent editor, so the input state persists.

Rendering:

Render a TerminalContainer (from terminal styles) to frame the editor.

Render the SmartInput component inside.

Props for SmartInput:

value: The current input text (from useSmartInput state).

suggestions: Derived from useSmartInput.

onChange: Handler that updates both local state and session draft.

onSubmit: No-op (scripts are saved via file actions, not executed line-by-line here).

promptLabel: null (hide the default prompt).

placeholder: "# Enter script...".

autoFocus: true.

2.2 Comment Handling Logic

To support comments correctly, we require updates in two shared logic files:

A. Syntax Highlighting (src/lib/terminal/components/syntaxHighlight.tsx)

Requirement: Update highlightSemanticText to recognize the # character.

Logic:

During tokenization or parsing of the input string:

If a token starts with # (or is part of a line starting with #), classify it as a "comment".

Render that segment with a specific style (e.g., theme.colors.secondary or a dimmed color).

B. Autocomplete Suppression (src/lib/terminal/Registry.ts)

Requirement: Do not offer suggestions when the cursor is inside a comment.

Logic:

In getSuggestions:

Analyze the text before the cursor in the current line.

Check if a # character exists in that line segment.

If yes, return an empty array [] immediately to suppress suggestions.

3. Pseudocode Implementation

// Imports: React, hooks, styles, SmartInput, Registry, runtime commands

Component CvsEditor(filename):
session = useModuleSession(filename)

    // Memoize registry to avoid recreation
    registry = useMemo(() => new CommandRegistry(RUNTIME_COMMANDS), [])

    // Guard: Loading
    if not session.isReady:
        return LoadingView()

    draftContent = session.draft.scripts[filename] OR ""

    // Initialize SmartInput hook
    { input, setInput, suggestions } = useSmartInput({
        registry,
        initialValue: draftContent
    })

    // Sync: If session content differs from local input (e.g. external reload), sync it
    // (Simplified logic: usually done via useEffect on draftContent change)

    // Handler: Text Change
    function handleChange(newValue):
        setInput(newValue) // Update local UI state

        session.updateDraft(draft => {
            ensure draft.scripts exists
            draft.scripts[filename] = newValue
        })

    // Render
    return (
        <TerminalContainer style="height: 100%; padding: 12px;">
            <SmartInput
                value={input}
                suggestions={suggestions}
                onChange={handleChange}
                onSubmit={noop}
                promptLabel={null}
                placeholder="# Enter script..."
                autoFocus={true}
            />
        </TerminalContainer>
    )

4. Dependencies & Files to Touch

src/ui/devtools/editors/file/CvsEditor.tsx (New Component)

src/lib/terminal/components/syntaxHighlight.tsx (Update: Add comment parsing logic)

src/lib/terminal/Registry.ts (Update: Add comment guard in suggestion logic)

5. Integration

File Routing:

This component is the target for .cvs files in WindowLayoutResolver.editors.tsx.

Data Contract:

It expects ModuleCartridge.scripts to be populated by the IO Adapter layer.

6. Testing Strategy

6.1 View Tests

Target: CvsEditor.tsx

Test: Renders SmartInput with Content

Given: A mock session with draft.scripts containing "spawn entity".

When: CvsEditor renders.

Then: A SmartInput component is present.

Then: The input value is "spawn entity".

Test: Updates Session

Given: A mock session.

When: The onChange handler of SmartInput is triggered with "kill entity".

Then: session.updateDraft is called.

Then: The update recipe sets draft.scripts[filename] to "kill entity".

6.2 Logic Tests

Target: syntaxHighlight.tsx & Registry.ts

Test: Highlight Comment

Input: spawn thing # comment

Output: The highlighter returns nodes where # comment has the correct style class/color.

Test: Suppress Autocomplete in Comment

Input: # spa (Cursor at end)

Output: getSuggestions returns [], effectively disabling autocomplete for that context.
