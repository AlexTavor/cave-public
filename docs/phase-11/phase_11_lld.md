LLD: Phase 11 — Draft Pools & Options Editors

This document defines the Low-Level Design for implementing the Draft Pools and Draft Options editors in the DevTools.

1. Compiler Refactor

1.1 Goal

Decouple action parsing logic from the Behavior Compiler to allow Draft Options (which only contain effects/actions) to reuse the same parsing logic without requiring the WHEN ... DO ... syntax wrapper.

1.2 Files & Logic

src/ui/devtools/editors/behaviors/compiler/actionCompiler.ts (New)

Responsibility: Parses raw tokens into BehaviorAction objects.
Logic:

Extracts the switch-case logic from behaviorCompiler.ts.

Validates action syntax (verbs, targets, values).

Supports parsing a sequence of actions joined by AND.

Interface:

export const parseAction = (tokens: string[]): BehaviorAction;

export const compileActionSequence = (input: string): BehaviorAction[];

src/ui/devtools/editors/behaviors/compiler/behaviorCompiler.ts (Modify)

Responsibility: Compiles full behavior rules.
Change:

Import parseAction from ./actionCompiler.

Replace internal parseAction implementation with the imported one.

Retain compileBehaviorRule which handles the WHEN/DO structure.

Tests (src/ui/devtools/editors/behaviors/compiler/actionCompiler.test.ts):

parseAction: Verifies SET, ADD, SPAWN verbs parse correctly.

compileActionSequence: Verifies strings like ADD gold 10 AND HEAL 5 produce an array of two actions.

Negative tests: Invalid verbs, missing arguments.

2. Store Extensions

2.1 Goal

Provide CRUD operations for Draft Options and Draft Pools within the ModuleStore to handle ID generation and cartridge consistency.

2.2 Files & Logic

src/ui/devtools/state/moduleStore.drafts.ts (New)

Responsibility: Domain logic for creating/deleting draft assets.
Logic:

createDraftOption: Generates unique ID (e.g. opt_xyz), adds default struct.

createDraftPool: Generates unique ID (e.g. pool_xyz), adds default struct.

deleteDraftOption: Removes from draftOptions.

deleteDraftPool: Removes from draftPools.

Interface:

export function createDraftOptionInModule(
moduleData: ModuleCartridge
): { updated: ModuleCartridge; optionId: string };

export function createDraftPoolInModule(
moduleData: ModuleCartridge
): { updated: ModuleCartridge; poolId: string };

// delete functions follow standard pattern

src/ui/devtools/state/moduleStore.ts (Modify)

Change: Register the new actions in ModuleStoreState and implement them using the helpers above.

Tests (src/ui/devtools/state/moduleStore.drafts.test.ts):

Verify creation generates valid, unique IDs.

Verify deletion removes the key from the record.

3. Routing & Virtual Paths

3.1 Goal

Enable navigation to the new editors via the activeFilePath / Virtual Path system.

3.2 Files & Logic

src/ui/devtools/shell/window-manager/virtualPath.ts (Modify)

Change:

Add options route kind: options::{filename}.

Add pool route kind: pool::{filename}::{poolId}.

Expand list route kind to support draft_pools category.

src/ui/devtools/shell/window-manager/tabIds.ts (Modify)

Change: Add ID generators for new routes (options:..., pool:...).

src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteSync.ts (Modify)

Change: Add handlers for new route kinds to open the appropriate FlexLayout tabs.

src/ui/devtools/shell/window-manager/WindowLayoutController.tsx (Modify)

Change: Map new component strings (draft_options, draft_pool_list, draft_pool_editor) to the actual React components.

4. UI Components: Draft Options Editor

4.1 src/ui/devtools/editors/draft/options/ActionInput.tsx

Responsibility: A specialized input field for editing action sequences (Payloads).
Logic:

Uses SmartInput for autocomplete.

Uses compileActionSequence for validation.

Removes the "WHEN" grammar hint; purely "Action verbs".

Props: value: string, onChange: (val: string) => void, onCommit: (val: string) => void.

4.2 src/ui/devtools/editors/draft/options/OptionAccordionItem.tsx

Responsibility: Renders a single Draft Option card.
Logic:

Collapsed: Shows Icon, Title, ID.

Expanded:

IdField (ReadOnly)

StringField for Title/Description.

EnumField for Rarity.

IconPicker for Icon.

ActionListEditor: Manages the payload array. Maps BehaviorAction[] to/from string representations.

4.3 src/ui/devtools/editors/draft/options/DraftOptionsPanel.tsx

Responsibility: Main container for the "Draft Options" tab.
Logic:

Connects to useSessionStore to get draft.draftOptions.

Renders a list of OptionAccordionItem.

Header with "Create Option" button (calls createDraftOption).

5. UI Components: Draft Pools Editor

5.1 src/ui/devtools/editors/draft/pools/DistributionBar.tsx

Responsibility: Visualizing probability distribution.
Logic:

Props: entries: DraftPoolEntry[], options: Record<string, DraftOption>.

Calculates total weight.

Renders a stacked bar (CSS Grid/Flex).

Segments width = (weight / total) \* 100%.

Colors derived from Option ID hash or Rarity.

Tooltip shows Percentage.

5.2 src/ui/devtools/editors/draft/pools/PoolEntryRow.tsx

Responsibility: Renders a single line in the pool editor.
Logic:

Displays Option Icon + Label.

Number Input for Weight.

"Remove" button.

5.3 src/ui/devtools/editors/draft/pools/DraftPoolEditor.tsx

Responsibility: The editor for a specific Pool ID.
Logic:

Connects to useBlueprintSlice (or equivalent for pools) via useSessionStore.

Renders DistributionBar.

Renders list of PoolEntryRow.

Footer: "Add Entry" (Autocomplete searching draftOptions).

6. Integration

6.1 src/ui/devtools/editors/fields/module-explorer/ModuleExplorerView.tsx

Change: Add new Dashboard Cards for "Draft Options" and "Draft Pools".

6.2 src/engine/registry/referenceIndex.ts

Change:

Update walk function.

Case draftOptions: Walk payload (actions) -> References Entity IDs (Spawn/Dispatch).

Case draftPools: Walk entries -> References Option IDs.

7. Testing Plan

7.1 Unit Tests (Compiler)

src/ui/devtools/editors/behaviors/compiler/actionCompiler.test.ts

compileActionSequence("ADD gold 10") -> [{ type: "MUTATE", ... }].

compileActionSequence("SPAWN ghost AND KILL self") -> [{ type: "SPAWN" }, { type: "KILL" }].

7.2 Unit Tests (Store)

src/ui/devtools/state/moduleStore.drafts.test.ts

Create/Delete Option logic.

Create/Delete Pool logic.

7.3 View Tests (Smoke)

src/ui/devtools/editors/draft/options/DraftOptionsPanel.test.tsx

Renders list of options.

"Add" button triggers store action.

src/ui/devtools/editors/draft/pools/DraftPoolEditor.test.tsx

Renders distribution bar.

Updates weight via input.
