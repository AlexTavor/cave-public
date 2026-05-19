HLD: Draft Pools & Options Editors

1. Executive Summary

This feature introduces a dedicated suite of tools within the DevTools to manage Draft Pools (logic containers for probability) and Draft Options (data units for choices). Currently, these data structures are managed via raw JSON or generic schema forms, which is error-prone and opaque.

The new UI will provide "comfy" visual editors:

Draft Options: A high-density accordion list for defining cards (Icon, Title, Rarity, Payload).

Draft Pools: A focused editor for balancing probabilities, featuring a visual distribution bar to "see" the math.

2. Architecture & Data Flow

2.1 Mental Model

Draft Options are the atoms. They define what happens.

Draft Pools are the molecules. They define when and how likely atoms appear.

Blueprints are the consumers. They trigger pools via behavior (TRIGGER_DRAFT).

2.2 Data Schema (Existing)

No schema changes are required. We interact with:

ModuleCartridge.draftOptions: Record<string, DraftOptionBlueprint>

ModuleCartridge.draftPools: Record<string, DraftPoolBlueprint>

2.3 Store & State

Persistence: Handled by useSessionStore (draft/undo/redo) and useModuleStore (disk IO).

CRUD Actions: New actions will be added to useModuleStore to handle creation and deletion of pools/options to ensure proper ID generation and index updates.

3. Technical Specifications

3.1 Compiler Refactor (The "How" of Payloads)

Problem: Currently, behaviorCompiler enforces a WHEN ... DO ... grammar. Draft Options only contain the DO part (Actions).
Solution: Refactor src/ui/devtools/editors/behaviors/compiler to decouple action parsing.

Extract: parseAction(tokens: string[]): BehaviorAction logic into a reusable export.

New Export: compileActionSequence(input: string): BehaviorAction[].

Splits input by AND.

Parses each segment as an action.

UI Component: Create ActionInput (a variant of BehaviorInput without the "WHEN" prefix requirement) for the Option Payload editor.

3.2 Virtual Paths & Routing

We will extend VirtualPath to support two new resource types:

Draft Options List: options::{filename}

Renders the Accordion Editor.

Draft Pools List: list::{filename}::draft_pools

Renders the standard list panel for pools.

Draft Pool Item: pool::{filename}::{poolId}

Renders the specific Pool Editor tab.

3.3 Reference Integrity

Update src/engine/registry/referenceIndex.ts to index:

Outgoing:

Pool -> Option (Pool Entry references Option ID).

Option -> Blueprint (Payload SPAWN references Blueprint ID).

Incoming:

Blueprint -> Pool (Behavior TRIGGER_DRAFT references Pool ID).

4. User Interface Design

4.1 Draft Options Editor (options::{filename})

Layout: Single tab, full height.

Header: Search/Filter input, "+ Create Option" button.

Body: Virtualized list (Virtuoso) of OptionAccordionItem.

OptionAccordionItem:

Collapsed:

Icon (Left), Title (Bold), ID (Dimmed), Rarity Badge (Right).

Actions: Duplicate, Delete.

Expanded:

Identity: ID (ReadOnly), Title (Input), Description (TextArea).

Visuals: IconPicker, Rarity Select (Common/Rare/Legendary/None).

Payload: ActionListEditor (List of ActionInput rows).

Supports adding multiple actions (e.g. ADD gold 10 AND HEAL 5).

4.2 Draft Pools List (list::{filename}::draft_pools)

Standard ListPanel implementation (reusing BlueprintList patterns).

Columns: ID, Item Count.

Actions: Open, Delete.

4.3 Pool Editor (pool::{filename}::{poolId})

Layout: ToolFrame with a custom body.

A. Distribution Visualizer (Header)

A horizontal stacked bar chart.

Each segment represents an option's probability (weight / totalWeight).

Tooltip on hover: "Option Name: 15%".

Why: Immediate visual feedback on balance (e.g., if one item dominates the pool).

B. Entry List

Sort Controls: "Sort by Name" vs "Sort by Weight (Desc)".

Rows:

Icon: Resolved from the referenced Option.

Label: Title of the Option (or "⚠️ Missing: {id}").

Weight: Number input (stepper). Allowing 0 to disable.

Actions: Remove button (X).

C. Footer (Add Entry)

Autocomplete: Smart input searching draftOptions IDs.

Add Button: Inserts new entry with default weight (1).

5. Implementation Phases

Phase 1: Core Logic & Routing

Refactor Compiler: Extract compileActionSequence.

Routing: Update virtualPath.ts, tabIds.ts, useWindowManagerRouteSync.ts.

Store Actions: Add CRUD actions to useModuleStore.

Phase 2: Draft Options UI

ActionInput: Create component using the new compiler.

OptionAccordion: Build the row component.

DraftOptionsPanel: Build the main list view.

Phase 3: Draft Pools UI

DistributionBar: Create the visualization component.

PoolEntryRow: Build the row with weight controls and option resolution.

PoolEditor: Assemble the editor view.

PoolList: Standard list view integration.

Phase 4: Integration

ModuleExplorer: Add tiles for "Draft Options" and "Draft Pools".

Reference Index: Update walker for dependency tracking.

6. Constraints & Edge Cases

Single File: Cross-module references are out of scope. Autocomplete only shows options/pools from the current file.

Validation: The UI allows creating "invalid" pools (empty) or options (no payload), relying on the Runtime to handle graceful failures or logs.

Weights: Weights are integers. 0 is valid (disabled).
