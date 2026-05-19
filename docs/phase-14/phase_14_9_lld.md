Editor UI V2 Low-Level Design

This document details the architecture for the V2 DevTools UI overhaul. It shifts the paradigm from a module-centric view to a strictly file-system-centric view, enforcing the separation between High-Level Logic (HLL) and Low-Level Logic (LLL).

1. System Overview

The new UI architecture aligns with the "Project" concept defined in the project_manual.md. It separates the visual hierarchy into:

Project Explorer: A direct visualization of the VFS state.

Context-Aware Editors: Specialized views determined by file extension.

Semantic Separation: Enforcing HLL (Abilities) vs LLL (Components) separation in the Blueprint editor.

2. File System Explorer

2.1 src/ui/devtools/project/ProjectExplorer.tsx

Responsibility:
Renders the file system tree structure (src/data/raw root), handling user input for navigation, selection, and context operations.

Interface:

interface ProjectExplorerProps {
className?: string;
onOpenFile: (path: string) => void;
}

Logic:

Data Source: Subscribes to vfs.tree() via useProjectExplorer.

Selection State: Uses a Set<string> to track selected paths (multi-select support).

Click: Select single.

Ctrl+Click (Cmd+Click): Toggle path in selection set.

Shift+Click: Range selection (requires flattening the tree to find intermediate nodes).

Navigation: Double-click on a file emits the onOpenFile callback (opens tab).

Drag & Drop: Implements HTML5 DnD API.

draggable: All file/folder nodes.

onDrop: Calls handleMove with e.dataTransfer paths and the target folder path.

Context Menu: Right-click triggers ExplorerContextMenu.

2.2 src/ui/devtools/project/useProjectExplorer.ts

Responsibility:
Encapsulates the state and CRUD logic for the explorer.

Interface:

export function useProjectExplorer(): {
tree: TreeNode;
selection: Set<string>;
expanded: Set<string>;
handleSelect: (path: string, modifier: 'add' | 'toggle' | 'range') => void;
handleToggleFolder: (path: string) => void;
handleMove: (sourcePaths: string[], targetPath: string) => Promise<void>;
handleDelete: (paths: string[]) => Promise<void>;
handleRename: (path: string, newName: string) => Promise<void>;
handleCreateFile: (parentPath: string, name: string, type: 'folder' | 'file') => Promise<void>;
}

Logic:

Refresh: Uses vfs.subscribe (or similar polling/event mechanism) to re-fetch the tree on changes.

Move Logic:

Validates that targetPath is a directory.

Validates that targetPath is not a child of any sourcePaths (circular move prevention).

Calls vfs.movePaths.

Delete Logic: Calls vfs.deletePaths.

2.3 src/ui/devtools/project/ExplorerContextMenu.tsx

Responsibility:
Displays available actions based on current selection.

Logic:

Multiple Selection: Show Delete, Move.

Single Selection: Show Rename, Delete, Duplicate.

Folder Target: Show New File, New Folder, Import from Disk.

3. Manifest Editor

3.1 src/ui/devtools/editors/manifest/ManifestEditor.tsx

Responsibility:
Provides a specialized GUI for manifest.json to manage project load order.

Interface:

interface ManifestEditorProps {
filename: string; // "manifest.json"
}

Logic:

Session: Uses a generic useJsonSession<ProjectManifest> to manage the draft state.

Ordering: Renders the files array as a vertical sortable list (using dnd-kit or similar).

Auto-Import:

Button: "Auto-Import All".

Handler: handleAutoImport.

Implementation:

Call vfs.scan("\*_/_.{cave,art,bp,draft}").

Filter out files already in manifest.files.

Append new files to the end of the list.

Update draft state.

Persistence: Saves directly to VFS via the session handle.

4. Semantic File Routing

4.1 src/ui/devtools/shell/window-manager/WindowLayoutResolver.tsx (Update)

Responsibility:
Routes TabNode requests to the correct editor component based on file extension.

Logic Change:
Remove dependency on global activeModuleFilename. Route strictly by file extension.

// Pseudo-code implementation
const path = node.getConfig()?.path;
const ext = getExtension(path);

switch (ext) {
case '.bp': return <BlueprintEditor filename={path} ... />;
case '.art': return <AssetPackEditor filename={path} />;
case '.cave': return <SystemConfigEditor filename={path} />;
case '.draft': return <DraftPackEditor filename={path} />;
case '.json':
return isManifest(path)
? <ManifestEditor filename={path} />
: <RawJsonEditor filename={path} />;
default: return <UnknownFileViewer path={path} />;
}

5. Blueprint Editor V2

5.1 src/ui/devtools/editors/blueprint/editor/BlueprintEditorView.tsx (Update)

Responsibility:
Enforces the HLL vs LLL separation via a rigid tab structure and provides top-level blueprint actions.

Interface:

interface BlueprintEditorViewProps {
isReady: boolean;
blueprint: Blueprint | null;
// ... actions
}

Logic:

State: Tracks activeTab: "designer" | "assembly". Defaults to "designer".

Toolbar:

Left: Blueprint Title/ID (editable via IdentityModal).

Right (Actions):

<PhysicsButton />: A new toggle button. When clicked, it switches the central view layout to the "Layout/Physics" visual editor mode (overlay or side-by-side) to allow dragging anchors.

<UndoButton /> / <RedoButton />.

<SaveButton />: Triggers validation and save.

<DuplicateButton />.

<DeleteButton />.

Render Area:

Tab Strip: "Abilities" (Default) | "Assembly" (Manual).

Content:

activeTab === "designer": Renders <DesignerMode />.

activeTab === "assembly": Renders <AssemblyDeck />.

5.2 src/ui/devtools/editors/blueprint/mode/AssemblyDeck.tsx

Responsibility:
Organizes the LLL components that are not compiled from abilities.

Logic:

Filter: Defines a strict allowlist of manual components: automation, narrative, powerSource, cave, face.

Constraint: Does NOT show state, upkeep, spawner (as these are Ability-driven).

Actions:

"Add Component" dropdown only lists the allowed manual components.

Layout: Uses <ComponentRow> items for each present component.

6. Flat File Editors

6.1 src/ui/devtools/editors/assets/AssetPackEditor.tsx

Responsibility: Editor for .art files.

Visuals: Vertical stack of collapsible sections.

Sections: IconGrid, ResourceList, StyleSheet, VisualSettings.

6.2 src/ui/devtools/editors/config/SystemConfigEditor.tsx

Responsibility: Editor for .cave files.

Visuals: Vertical stack.

Sections: ImpulseSettings (Physics globals), VitalitySettings, GameConfig.

6.3 src/ui/devtools/editors/draft/DraftPackEditor.tsx

Responsibility: Editor for .draft files.

Visuals: Two main columns or stacked sections.

Sections: DraftOptionsList, DraftPoolsList.

7. Quality Assurance Strategy

7.1 Unit Tests (Logic)

Target: useProjectExplorer.ts, useJsonSession.ts.

Scope: Verify state transitions, CRUD operations, and VFS interactions without rendering components.

7.2 Integration Tests (UI)

Target: ProjectExplorer.tsx, BlueprintEditorView.tsx.

Scope: Verify React component rendering, event handling (clicks, drag-and-drop simulation), and store updates.

7.3 End-to-End (E2E) Testing Strategy

Tooling: Playwright.

Why: To ensure the complex state interactions between the UI, the in-memory VFS, and the Compiler Contract hold up during actual user workflows.

Setup:

Install Playwright: npm init playwright@latest.

Configure playwright.config.ts to point to the local dev server.

Create a TerminalDriver utility class to drive the in-game terminal for "back-door" state verification (e.g., using ls or cat to verify file creation without relying solely on UI DOM elements).

Test Scenarios:

Scenario A: The "New Project" Flow

Given: An empty VFS (fresh browser session).

When:

User clicks "New Project".

User types "MyGame".

User creates a new file modules/entities.bp via the Explorer context menu.

User opens manifest.json and clicks "Auto-Import All".

User saves manifest.json.

Then:

Verify manifest.json content includes modules/entities.bp.

Verify the Project Explorer visually renders the file.

Scenario B: The "Ability Compiler" Flow

Given: A loaded project with player.bp.

When:

User opens player.bp in the Blueprint Editor.

User selects "Abilities" tab (default).

User adds a Cycle ability (Max: 100).

User clicks "Save".

Then:

Backend Check: Use TerminalDriver to cat player.bp.

Assertions:

Verify \_editor.abilities.cycle is present.

Verify components.state.cycle is present (compiled).

Verify components.powerSink is present (compiled).

Scenario C: The "Refactor" Flow

Given: folder/old.bp exists and is referenced in manifest.json.

When:

User right-clicks folder/old.bp in Explorer -> "Rename".

User inputs folder/new.bp.

Then:

Verify folder/old.bp is visually gone.

Verify folder/new.bp is visually present.

Backend Check: cat manifest.json verifies the path was updated automatically.

Scenario D: The "Physics Visual" Flow

Given: box.bp is open in Blueprint Editor.

When:

User clicks the <PhysicsButton /> in the toolbar.

Then:

Verify the central editor view switches to the Visual Physics layout (Canvas + Anchors).

Verify interaction elements (anchors) are visible.
