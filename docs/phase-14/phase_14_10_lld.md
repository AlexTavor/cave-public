phase_14_10_lld.md

Low-Level Design: Rich Semantic Editors & IO Adapters

Phase: 14.10

Status: Approved

Context: AI Context Pack v1

Scope: Devtools UI, File IO Logic, Schema Updates

1. Overview

This design specifies the implementation of structured editors for specific file types (.cave, .art, .bp, .draft, .cvs) within the Devtools environment.

To maintain a unified "Session" architecture where every open file supports Undo, Redo, and Auto-save tracking, we introduce an IO Adapter Layer. This layer seamlessly translates between the specific on-disk formats (single objects or raw text) and the in-memory ModuleCartridge format required by the store.

Primary Goals:

Structured Editing: Replace raw JSON editors with domain-specific UI.

File Format Independence: Allow .bp files to contain a single Blueprint and .cvs files to contain raw text, while treating them as Modules in memory.

Unified Session Management: Reuse existing moduleStore logic for all file types.

Constraints:

No "Apply to Runtime" features in this phase.

No business logic in React Views.

Strict adherence to the Single-File Blueprint and Raw Script contracts.

2. Data & Schema Changes

We must extend the internal ModuleCartridge schema to act as a container for raw script content. This allows the moduleStore to manage script files using the same versioning and history mechanisms as structured data.

2.1 src/data/schemas/module.ts

Responsibility: Define the superset data structure for all game modules.

Change Specification:

Add an optional scripts field to the ModuleCartridgeSchema.

Type: Map/Record where Key is the filename and Value is the raw string content.

Default: Empty object if undefined.

3. IO Adapter Layer

The IO Adapter bridges the gap between the persistent storage (Disk/VFS) and the application state (Zustand Store). It ensures that regardless of what a file looks like on disk, the application always interacts with a ModuleCartridge.

3.1 src/ui/devtools/state/moduleStore.io.ts

Responsibility: Intercept Read/Write operations to transform data formats based on file extensions.

Logic: readModule(filename)

Read File Content: Fetch raw text from VFS.

Determine Strategy by Extension:

Case .bp (Single Blueprint):

Parse text as JSON (Expect Blueprint object).

Create a Synthetic Cartridge:

metadata: derive ID/Name from filename.

blueprints: Map containing { [blueprint.id]: blueprint }.

Other fields: Empty/Default.

Return Synthetic Cartridge.

Case .cvs (Cave Script):

Treat raw text as the content.

Create a Synthetic Cartridge:

metadata: derive ID/Name from filename.

scripts: Map containing { [filename]: rawText }.

Other fields: Empty/Default.

Return Synthetic Cartridge.

Case Default (.json, .cave, .art, .draft):

Parse text as JSON.

Return as standard ModuleCartridge.

Logic: saveModule(filename, data)

Determine Strategy by Extension:

Case .bp:

Access data.blueprints.

Validation: Ensure at least one blueprint exists.

Selection: Pick the blueprint matching the filename ID (if present), otherwise the first available one.

Write: Serialize only that specific Blueprint object to JSON.

Write to VFS.

Case .cvs:

Access data.scripts[filename].

Validation: Ensure content exists (default to empty string if missing).

Write: Write raw string to VFS.

Case Default:

Perform standard version bump on data.metadata.version.

Serialize full ModuleCartridge to JSON.

Write to VFS.

3.2 src/engine/workspace/projectManifest.ts

Responsibility: Load project files into memory for the Linker. This must mirror the logic of the IO Adapter to ensure the Runtime sees the same data structure as the Editors.

Logic: assertValidProjectModules(root, files)

Iterate through the file list.

For each file:

If .bp: Read text, parse JSON, wrap in synthetic ModuleCartridge structure (mirroring IO Adapter).

If .cvs: Read text, wrap in synthetic ModuleCartridge structure (putting text into scripts).

If .json / others: Read text, parse JSON, validate as ModuleCartridge.

Return map of filename -> ModuleCartridge.

4. Editor Container Components

We introduce a dedicated directory src/ui/devtools/editors/file/ to house the "Root" components for each file type. These components are responsible for connecting a generic ModuleSession to a specific Domain Editor.

4.1 BlueprintFileEditor.tsx

Responsibility: Connects a .bp file session to the BlueprintEditor.

Logic:

Initialize Session: Call useModuleSession(filename).

Derive Target ID: Look at session.draft.blueprints.

Return the ID of the first blueprint found.

Handle Loading: Show loading state if session is not ready.

Handle Empty/New: If no blueprint exists in the draft (newly created file):

Render a "Creation View" (Simple form to input ID/Label).

On submit, dispatch createBlueprint action to the session.

Render Editor: If ID exists, render <BlueprintEditor filename={filename} blueprintId={id} />.

4.2 CvsEditor.tsx

Responsibility: Connects a .cvs file session to a text editing surface.

Logic:

Initialize Session: Call useModuleSession(filename).

Bind Value: Read session.draft.scripts[filename]. Default to empty string.

Render UI: Render a StyledInput (textarea variant).

Handle Change: On text change:

Call session.updateDraft.

Mutator function: draft.scripts[filename] = newValue.

4.3 AssetPackEditor.tsx

Responsibility: Connects a .art file session to the Asset management UI.

Logic:

Initialize Session: Call useModuleSession(filename).

Render UI:

Render AssetListPanel pointing to the current filename.

(Optionally) Handle internal routing if AssetListPanel requires distinct tabs.

4.4 SystemConfigEditor.tsx

Responsibility: Connects a .cave file session to System Configuration UI.

Logic:

Initialize Session: Call useModuleSession(filename).

Render UI:

Render ImpulseSettingsEditor (Physics).

(Future) Render GameConfigEditor (Vitality/Rules).

Use internal Tabs to switch between these views.

4.5 DraftPackEditor.tsx

Responsibility: Connects a .draft file session to Draft mechanics UI.

Logic:

Initialize Session: Call useModuleSession(filename).

Render UI:

Render DraftPoolListPanel.

Render DraftOptionsPanel.

Use internal Tabs.

5. Routing Update

We must update the Shell's layout resolver to map file extensions to these new Container Components.

5.1 src/ui/devtools/shell/window-manager/WindowLayoutResolver.editors.tsx

Responsibility: Map TabNode configuration to React Elements.

Logic Update:

Import the new components from src/ui/devtools/editors/file/.

In resolveFileComponent(path):

Switch on extension:

.bp -> <BlueprintFileEditor />

.cvs -> <CvsEditor />

.art -> <AssetPackEditor />

.cave -> <SystemConfigEditor />

.draft -> <DraftPackEditor />

.json -> Check isManifest:

True -> <ManifestEditor />

False -> <RawJsonEditor />

Default -> <UnknownFileViewer />

6. Testing Strategy

We adhere to the "Behavior, Not Implementation" standard. Tests must verify that the adapters correctly transform data without needing to inspect the internal state of the Store classes directly.

6.1 Unit Tests (moduleStore.io.test.ts)

Scope: Verify IO Adapter logic in isolation.

Test: Read Single Blueprint

Given: A mock VFS containing test.bp with a raw Blueprint JSON object.

When: readModule("test.bp") is called.

Then: The result is a ModuleCartridge object containing that blueprint in the blueprints map.

Test: Write Single Blueprint

Given: A ModuleCartridge with one blueprint.

When: saveModule("test.bp", cartridge) is called.

Then: The mock VFS receives a write call for test.bp containing only the Blueprint JSON.

Test: Read Script

Given: A mock VFS containing script.cvs with raw text "HELLO WORLD".

When: readModule("script.cvs") is called.

Then: The result is a ModuleCartridge with scripts["script.cvs"] === "HELLO WORLD".

Test: Write Script

Given: A ModuleCartridge with script content.

When: saveModule("script.cvs", cartridge) is called.

Then: The mock VFS receives a write call with the raw text string.

6.2 View Tests (Component Smoke Tests)

Scope: Verify all container components mount and bind to session state correctly.

Test: BlueprintFileEditor Mount

Given: A mocked useModuleSession hook returning a ready draft with one blueprint.

When: <BlueprintFileEditor /> renders.

Then: The BlueprintEditor child component is present in the tree.

Test: CvsEditor Interaction

Given: A mocked useModuleSession returning a draft script.

When: Text input value is changed.

Then: The session's updateDraft method is called with the new value.

Test: AssetPackEditor Mount

Given: A mocked useModuleSession returning a cartridge with asset data.

When: <AssetPackEditor /> renders.

Then: The AssetListPanel component is present.

Test: SystemConfigEditor Mount

Given: A mocked useModuleSession returning a cartridge with config data.

When: <SystemConfigEditor /> renders.

Then: The ImpulseSettingsEditor (or tab controller) is present.

Test: DraftPackEditor Mount

Given: A mocked useModuleSession returning a cartridge with draft data.

When: <DraftPackEditor /> renders.

Then: The DraftPoolListPanel component is present.

7. Implementation Plan

Schema Update: Modify src/data/schemas/module.ts to include scripts.

IO Adapter: Implement the logic in src/ui/devtools/state/moduleStore.io.ts.

Project Loader: Align src/engine/workspace/projectManifest.ts with the new IO logic.

Editor Containers: Create the src/ui/devtools/editors/file/ directory and implement all 5 wrapper components (BlueprintFileEditor, CvsEditor, AssetPackEditor, SystemConfigEditor, DraftPackEditor).

Routing: Update WindowLayoutResolver.editors.tsx to route extensions to the new containers.

Cleanup: Remove old/unused editor wrappers from the previous structure
