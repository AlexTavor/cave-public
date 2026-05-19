LLD: Absorption UI & Interactivity

Status: Proposed
Layer: UI (React Components, Terminal)
Context: Canonical Context Pack v1
Dependencies: Absorption Engine LLD

1. Executive Summary

The "Why"

To provide a dedicated interface for the "Harvest" phase, allowing players to select specific bodies for absorption. The UI must handle large populations efficiently via mass-selection and provide clear feedback on the economic outcome (XP gain) before commitment.

The "What"

A Body Selector modal utilizing a "Brick Bar" visualization for dense population management. It features drag-paint selection, attribute sorting, and rich tooltips using the existing FaceCard. An Absorption View integrates this into the JobCard for stations like the Throne.

The "How"

Terminal: game.absorb for headless testing of the engine.

Selector UI: BodySelector managing the selection state and yield calculation.

Visualization: BodyBrick component for the timeline-like list.

Integration: AbsorptionView replaces standard Job logic in JobCard when applicable.

2. Developer Tooling

2.1 src/ui/runtime/terminal/commands/gameAbsorbCommand.ts

Responsibility: Developer command to test the absorption flow engine logic.

Usage: game.absorb <...entityIds>

Logic:

Parse args (list of entity IDs).

Get Runtime.

Find Target: Search world for the first entity with AssignmentComponent. Error if none found.

Filter: Validate provided IDs exist in the world and are not currently locked (flag_locked).

Execute: For each valid ID, queue DISPATCH_PROXY command: { entityId, targetId }.

Autocomplete:

Return list of all Body entity IDs that are NOT locked.

3. Components

3.1 src/ui/runtime/world/selection/absorption/BodySelector.tsx

Responsibility: Modal/Overlay interface for selecting bodies.

Props:

runtime: Runtime

onConfirm: (ids: string[]) => void

onCancel: () => void

State:

selectedIds: Set<string>

sortMode: 'attributes' | 'xp' | 'health' (default: 'xp')

isDragging: boolean

dragTargetState: boolean (True = selecting, False = deselecting)

Logic:

Data Preparation (Memoized):

Query all entities with BodyComponent.

Pre-calc Face Status: Query all Face entities to build a Set<string> of body IDs currently assigned to faces.

Filter: Exclude sys_swarm and bodies where flag_locked === true.

Sort:

xp: Descending by (Level \* 100 + Total Attributes).

attributes: Descending by highest single attribute.

health: Descending by current health %.

Layout (The Brick Bar):

Render a flex container: flex-direction: row, flex-wrap: wrap, gap: 2px.

Render each candidate as a BodyBrick (see 3.2).

Interaction (Paint Select):

onMouseDown(id):

Determine target state: !selectedIds.has(id).

Set isDragging = true, dragTargetState = target.

Update selectedIds for id.

onMouseEnter(id):

If isDragging: Set selection state of id to dragTargetState.

onMouseUp: Set isDragging = false.

Outcome Summary:

Calculate Yield: Sum((Level _ 100) + ((Body + Mind + Social) _ 10)) for all selected bodies.

Display: "Selected: N bodies".

Display: "Expected Yield: X XP".

Controls:

Header: Sort Buttons [Attributes] [XP] [Health].

Footer: "Sacrifice" (Primary Button) -> calls onConfirm. "Cancel" (Ghost Button).

Test: BodySelector.test.tsx

Verify sorting changes order of items.

Verify drag-paint selects multiple items.

Verify XP summation matches formula.

3.2 src/ui/runtime/world/selection/absorption/BodyBrick.tsx (New)

Responsibility: A compact, interactive visual for a single body.

Props:

entity: RuntimeEntity

runtime: Runtime

selected: boolean

isFace: boolean (derived from parent pre-calc)

onMouseDown: () => void

onMouseEnter: () => void

Visuals:

Container: div (w: 32px, h: 48px).

Background: Color coded by dominant attribute (Red/Blue/Gold).

Content:

Center: GameIcon (Portrait or default body icon).

Top-Right Badge (If isFace): Small Crown Icon 👑.

State Styles:

selected: Scale 1.1, Border: 2px solid White, Z-Index 1.

!selected: Opacity 0.8, Border: 1px solid Transparent.

Tooltip:

Wrap container in <SmartTooltip>.

Content: <FaceCard entity={entity} runtime={runtime} />.

3.3 src/ui/runtime/world/selection/job-card/AbsorptionView.tsx

Responsibility: The specific view rendered inside JobCard when the entity is an Absorption Node.

Props:

entity: RuntimeEntity (The Station)

runtime: Runtime

Logic:

Data Access:

assignedIds: Read entity.assignment.assignedIds (default []).

progress: Read entity.state.absorption_progress.value (default 0).

duration: Read entity.state.absorption_duration.value (default 100).

Mode A: Idle (assignedIds.length === 0)

Display Status: "Hungering..."

Action: "Select Tribute" Button -> Opens BodySelector (managed via local state isSelectorOpen).

Modal Integration: When isSelectorOpen, render BodySelector inside a <Modal>.

Mode B: Active (assignedIds.length > 0)

Display Status: "Digesting...".

Render ProgressBar: current={progress}, max={duration}.

Render List: "Consuming X entities".

Action: "Abort" Button -> Emits RECALL_PROXY command for every ID in assignedIds.

Test: AbsorptionView.test.tsx

Render Idle state: Ensure Selector opens on click.

Render Active state: Ensure Progress Bar reflects state, Abort fires Recall commands.

3.4 src/ui/runtime/world/selection/JobCard.tsx (Update)

Responsibility: Routing logic to switch between standard Job view and Absorption view.

Changes:

Condition: Check if entity has an AssignmentComponent.

Render:

If true: Return <AbsorptionView entity={entity} runtime={runtime} />.

If false: Return existing <PowerMatrix ... /> logic.

4. Visual Feedback (World Layer)

4.1 src/ui/runtime/world/EntityNode.tsx (Update)

Responsibility: Distinguish Proxies from real bodies in the world view.

Changes:

Detection: Check entity.tags.includes('proxy') OR presence of ProxyComponent.

Style Application:

If Proxy: Apply NodeContainer style override:

opacity: 0.6;
filter: grayscale(0.8) contrast(1.2);

Rationale: Makes them look like "ghosts" or "holograms" without requiring new assets.
