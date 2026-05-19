Low Level Design: Optimized Progress Bar Rendering

1. Context & Problem Statement

The Problem

Currently, ProgressBar components in the EntityNode do not update their visual state (width) to reflect changes in the simulation (Runtime).

Stale Data: The useEntityNodeModel hook memoizes the bar configuration based on the entity object reference. Since miniplex recycles entity objects and mutates them in place, the React dependency [entity] does not change when internal values (like state.progress.value) change. Thus, the bars remain stuck at their initial render value.

Performance Constraint: Removing the useMemo to force updates would couple the high-frequency simulation loop (60Hz) to the React render cycle. This would cause "rendering thrashing," forcing React to reconcile the entire Entity tree every frame, which is prohibitively expensive for a game UI.

The Goal

Implement a Direct DOM Binding (Bypass Pattern) solution that:

Updates progress bar visuals at 60fps in lockstep with the simulation.

Bypasses the React Virtual DOM / Reconciliation cycle for these updates.

Maintains the existing declarative ECS architecture.

2. Architecture: The Entity State Link

We will introduce a new subsystem, EntityStateLink, analogous to the existing WorldRenderLink (which handles physics positions).

Core Concept

Registry: A centralized provider (EntityStateLinkProvider) maintains a registry mapping EntityID + BarID to a specific DOM HTMLElement.

Render Loop: The provider runs a requestAnimationFrame loop.

Direct Mutation: Every frame, the loop reads the latest values directly from the Runtime (ECS) and mutates the style.width of the registered DOM elements.

React's Role: React is responsible only for mounting the bar and registering the reference. It handles existence, not mutation.

3. Implementation Specification

3.1. src/ui/lib/atoms/progress-bar/types.ts

Change: Extend props to accept a ref for the internal fill element.

// Interface Definition
export interface ProgressBarProps {
// ... existing props
/\*\*
_ Ref to the internal fill element.
_ Used for direct DOM manipulation (bypassing React render cycle).
\*/
fillRef?: React.Ref<HTMLDivElement>;
}

3.2. src/ui/lib/atoms/progress-bar/ProgressBar.tsx

Change: Forward the fillRef to the BarFill styled component.

Logic:

Pass fillRef to the <BarFill> render.

Ensure BarFill continues to accept width via props for initial SSR/static rendering, but allows the ref to override style.width at runtime.

3.3. src/ui/runtime/world/EntityStateLink.tsx (New File)

Responsibility: The engine for the Bypass Pattern.

Interfaces:

type BarBinding = {
entityId: string;
valuePath: string; // e.g., "state.progress.value"
maxPath?: string; // e.g., "state.threshold.value"
maxValue?: number; // Static fallback
element: HTMLElement;
};

// Context
interface EntityStateLinkContextValue {
register: (id: string, binding: Omit<BarBinding, 'element'>, element: HTMLElement) => void;
unregister: (id: string) => void;
}

Logic (EntityStateLinkProvider):

State: useRef<Map<string, BarBinding>>.

Loop: useEffect starts a requestAnimationFrame loop.

Tick:

Access useRuntimeStore.getState().runtime.

Iterate through the Map.

For each binding:

Get entity from Runtime by entityId.

Traverse entity using valuePath to get current.

Traverse entity using maxPath (or use maxValue) to get max.

Calculate percent = clamp(current / max, 0, 1) \* 100.

Write element.style.width = '${percent}%'.

Optimization: Cache path traversal functions or use a fast-path helper (avoiding heavy lodash/regex overhead inside the loop).

Hook: useEntityBarRef(binding)

Creates a useRef<HTMLDivElement>.

useLayoutEffect to call register on mount and unregister on unmount.

Returns the ref.

3.4. src/ui/runtime/world/useEntityNodeModel.ts

Change: Update the bars data structure to include raw configuration required for the link.

Interfaces:

// Update EntityNodeModel['bars'] item type
{
id: string;
// ... existing visual props
// Add raw config for binding
config: {
key: string; // The raw state key (e.g., "state.hp")
max?: number;
maxKey?: string;
}
}

Logic:

In resolveBars, preserve the original key, max, and maxKey from the DisplayComponent schema into the returned model.

3.5. src/ui/runtime/world/EntityNode.tsx

Change: Refactor to use a sub-component for bars to enable individual hook usage.

Logic:

Extract a new local component: LiveProgressBar.

LiveProgressBar accepts { entityId, barModel }.

Inside LiveProgressBar:

Call useEntityBarRef with the entity ID and paths.

Render ProgressBar passing the returned ref as fillRef.

EntityNode renders list: {bars.map(bar => <LiveProgressBar ... />)}.

3.6. src/ui/runtime/shell/RuntimeShell.tsx

Change: Wrap the world rendering tree with EntityStateLinkProvider.

Logic:

Nest <EntityStateLinkProvider> inside WorldRenderLinkProvider (or at the same level).

4. Testing Strategy

4.1. Unit Tests (EntityStateLink.test.tsx)

Registry: Verify register adds to the internal Map and unregister removes it.

Path Resolution:

Create a mock Entity object: { state: { hp: { value: 50 } } }.

Test the internal helper that resolves "state.hp.value" to 50.

Test handling of undefined paths (should default to 0 or safe fallback).

Calculation: Verify percentage math (e.g., 50/100 -> 50%, 0/0 -> 0%).

4.2. Component Tests (LiveProgressBar.test.tsx)

Mounting: Render LiveProgressBar.

Ref Attachment: Verify the ProgressBar receives a ref.

Registration: Mock useEntityStateLink context. Verify register is called with correct paths derived from props.

4.3. Integration / Smoke Tests

Visual Verification:

Mock the Runtime and useRuntimeStore.

Render the full RuntimeShell with a test entity having a bar.

Manually trigger the "tick" or mock the RAF.

Update the mock Runtime entity state (e.g., hp.value = 20).

Assertion: Check that the DOM element's style.width updates to "20%" without the React component re-rendering (spy on render).

5. Architectural Compliance Checklist

[x] Single-File Mandate: All new logic grouped logically; no fragmentation.

[x] No React duplications: State remains in ECS; UI just peers into it.

[x] Visual Excellence: The solution ensures smooth 60fps animations.

[x] Error Handling: Graceful handling of missing entities or bad paths in the render loop.

[x] Strict Paths: Not applicable (no Firestore), but internal object paths are strict.

6. Implementation Order

Primitives: Update ProgressBar to accept refs.

Infrastructure: Create EntityStateLink provider and hook.

Integration: Update useEntityNodeModel and EntityNode.

Wiring: Add provider to RuntimeShell.

Verification: Add tests.
