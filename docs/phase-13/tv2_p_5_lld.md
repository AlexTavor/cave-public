LLD: Phase 5 — Polish & Lifecycle

This document details the architecture for the final phase of the V2 Tooling plan. It focuses on enabling lifecycle transitions (e.g., Construction Site → House) via the compiler, adding safety rails (validation/filtering), and providing an escape hatch from the Designer Mode ("Eject").

1. Schema Updates

1.1 src/data/schemas/abilities/cycle.ts

Goal: Allow the Cycle ability (the progress bar) to dictate what happens when it completes, specifically facilitating entity transformation.

Changes:

Update CycleAbilitySchema.

Add optional field transformTo (string): The ID of the blueprint to transform into upon cycle completion.

Add optional field keepProgress (boolean): If true, attempts to map current cycle progress to the new blueprint's cycle (defaults to false).

Logic:

This field is the declarative source for the PATCH_BLUEPRINT command generation.

2. Compiler Logic Updates

2.1 src/engine/compiler/abilities/cycleCompiler.ts

Goal: Generate the behavior rules necessary to execute a lifecycle transition when the cycle completes.

Logic:

Input: CycleAbilityConfig (including transformTo), Blueprint draft.

Process:

Standard cycle logic generation (accumulation passives).

New: If transformTo is present:

Generate a new behavior rule: sys_cycle_transition.

Condition: state.cycle.value >= state.cycle.max.

Action: PATCH_BLUEPRINT

blueprintId: config.transformTo.

components: {} (The handler handles the merging).

Conflict Handling: If a Conversion ability also exists and uses the cycle, the compiler must ensure they don't generate conflicting completion rules. (Ideally, Conversion handles the "Process" and Cycle handles the "Transition", usually mutually exclusive in this design, or sequenced).

2.2 src/engine/compiler/validation/collisionDetector.ts (New)

Goal: Analyze the \_editor configuration to detect logical errors before compilation/runtime.

Responsibility:

Scan all configured abilities.

Map "Write Paths" (state keys) claimed by each ability.

Map "Read Paths" required by each ability.

Return a list of ValidationIssue objects: { id: string, severity: 'error' | 'warning', message: string, ability: string }.

Logic:

Duplicate Resource Checking:

Iterate storage, production, upkeep.

If multiple entries target the same resource ID, flag as Error.

State Collision:

If Cycle claims state.cycle and another ability (hypothetically) tries to write to state.cycle, flag as Error.

Orphaned Dependencies:

If Upkeep requires wood, but no Storage for wood exists, flag as Warning.

3. Editor & UI Actions

3.1 src/ui/devtools/state/moduleStore.actions.eject.ts (New)

Goal: Implement the "Eject" workflow, converting a "Managed" (Designer Mode) blueprint into a "Raw" blueprint permanently.

Interface:

ejectBlueprint(params: { filename: string, blueprintId: string }): Promise<void>

Logic:

Load: Retrieve the module and the specific blueprint.

Verify: Ensure \_editor field exists.

Compile: Run CompilerService.compile(blueprint) one last time to ensure the components (behavior, state, display) exactly match the intent in \_editor.

Strip: Remove the \_editor field from the blueprint object.

Persist: Save the modified blueprint back to the module.

UX: The UI will naturally switch to "Raw Mode" because the \_editor field is gone.

3.2 src/ui/devtools/editors/blueprint/mode/forms/CycleAbilityForm.tsx

Goal: Expose the lifecycle transition configuration.

Changes:

Add a section for "Lifecycle Transition".

Include a Blueprint Picker (Autocomplete/Select) bound to transformTo.

Filters: Exclude self (prevent immediate infinite loop, though valid in some cases, usually bad UX).

Include a checkbox for keepProgress (if we implement that schema field).

3.3 src/ui/devtools/editors/blueprint/components/validation/ValidationHud.tsx (New)

Goal: Display real-time validation errors to the user in a non-intrusive way.

Interface:

ValidationHudProps: { issues: ValidationIssue[] }

Behavior:

Position: Fixed bottom-right of the editor container.

Animation: Uses <Animatable type="slideLeft" /> to enter/exit.

Content:

Renders a Card component (variant surface or modal with danger border).

Lists issues with icons (Error vs Warning).

Visibility: Only renders if issues.length > 0.

3.4 src/ui/devtools/editors/blueprint/hooks/useBlueprintValidation.ts (New)

Goal: Reactive hook that runs the collision detector.

Logic:

Input: blueprint (current draft).

Process: Memoized call to collisionDetector(blueprint.\_editor).

Return: { issues: ValidationIssue[], hasErrors: boolean }.

Scope: Local to the current blueprint (does not scan entire module).

3.5 src/ui/devtools/editors/blueprint/components/toolbar-actions/SaveButton.tsx (Update)

Goal: Indicate invalid state during save.

Changes:

Input: Consumes useBlueprintValidation.

Styling:

If hasErrors is true: Button color changes to danger (Red).

Tooltip:

If hasErrors is true: Add tooltip text "Invalid Abilities will not be saved".

Behavior:

The save action still proceeds (to prevent data loss of work-in-progress), but the user is visually warned that the resulting runtime behavior might be broken or incomplete.

4. UI Polish & filtering

4.1 src/ui/devtools/fields/module-explorer/hooks/useBlueprintListFilter.ts (New)

Goal: Encapsulate the logic for filtering the blueprint list to reduce noise.

Interface:

useBlueprintListFilter(blueprints: BlueprintEntry[]): BlueprintEntry[]

Logic:

State: Maintain a local state showSystem (boolean, default false).

Filter:

If showSystem is true, return all.

If showSystem is false, exclude blueprints where tags contains "system" or "internal".

Return: { filteredBlueprints, showSystem, toggleSystem }.

4.2 src/ui/devtools/editors/fields/module-explorer/BlueprintList.tsx

Goal: Apply the filter.

Changes:

Integrate useBlueprintListFilter.

Render a "Filter" toggle icon in the toolbar/header.

Render the filtered list instead of the raw list.

4.3 src/ui/devtools/editors/blueprint/components/toolbar-actions/EjectButton.tsx (New)

Goal: UI trigger for the Eject action.

Responsibility:

Render a "Warning" style button (e.g., orange/red icon).

On click, show a confirmation modal explaining: "This will remove High-Level controls. You will be left with the raw ECS components. This cannot be undone via the editor (requires Undo)."

On confirm, call moduleStore.ejectBlueprint.

5. Integration Points

Runtime: The PatchBlueprintHandler already exists in the runtime. Phase 5 relies on this existing handler functioning correctly to merge the components from the target blueprint into the entity.

Module Store: The eject action needs to be registered in the moduleStore.

Validation: The BlueprintEditor must integrate useBlueprintValidation and mount ValidationHud.

6. Verification Plan

Lifecycle Test:

Create bp_site. Add Cycle (max 100). Set transformTo -> bp_house.

Spawn bp_site.

Use set_state command to fill cycle to 100.

Tick.

Verify Entity ID is preserved.

Verify Entity blueprintId (if tracked) or components now match bp_house.

Eject Test:

Create bp_managed with abilities.

Click Eject.

Verify \_editor is gone.

Verify components (behavior, state) are still present and populated.

Verify editor is now in Raw Mode.

Validation Test:

Add two Storage abilities for "wood".

Verify ValidationHud slides in at the bottom right.

Verify Save button turns Red.

Hover Save button, verify tooltip: "Invalid Abilities will not be saved".

Remove one Storage ability.

Verify ValidationHud slides out.

Verify Save button reverts to normal.

UI Smoke Tests (Mandatory):

CycleForm: Open a blueprint with a transformTo value pointing to a deleted blueprint. Verify form renders "Unknown" or empty state without crashing.

BlueprintList: Enable "Hide System" filter. Ensure list renders empty state gracefully if all blueprints are filtered out.

EjectButton: Ensure button handles click events safely even if the blueprint data is momentarily stale during a save.

Sanitization: Ensure useBlueprintListFilter handles null/undefined tags arrays gracefully (legacy blueprints).
