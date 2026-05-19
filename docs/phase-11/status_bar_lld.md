Low-Level Design: Runtime Status Bar

Status: Draft (Approved)
Author: AI Assistant
Date: 2026-02-06
Context: Adds a persistent status footer to the runtime shell, replacing the floating TimeControlPanel.

1. Overview

The RuntimeStatusBar is a persistent UI element docked to the bottom of the game viewport. It aggregates three distinct domains of information:

Global Resources: Real-time tracking of Wood, Edibles, Heat, etc.

Entity Status: Specific stats for the Player/Cave entity (Health, XP, Capacity).

Time Controls: Game clock visualization and simulation speed controls.

1.1 Goals

Layering: Must reside within the RuntimeShell so that the EditorShell (DevTools) can overlay it without Z-index fighting.

Performance: Must update every tick (approx 60fps target for time/resources) without re-rendering the entire component tree.

Consolidation: Replaces the floating TimeControlPanel.

2. Architecture

2.1 Visual Hierarchy & Layering

The RuntimeShell will transition from a simple container to a Flex Column layout.

App (Root)
└── UiRoot
├── RuntimeShell (Flex Column, 100vh)
│ ├── RuntimeViewport (Flex: 1, overflow-hidden)
│ └── RuntimeStatusBar (Flex: 0, Fixed Height, z-index: 10)
└── EditorShell (Absolute Overlay, z-index: 9999)

2.2 State Management Strategy

To adhere to the Granular Selector pattern (Context Pack §4), we will not pass data down from the Shell. Instead, we use "Smart Atoms".

Atomic Subscriptions: Each sub-component (ResourceItem, StatGauge, RuntimeClock) connects directly to useRuntimeStore.

No Derived Logic in Render: Calculations like "Usage Ratio" must be performed inside the selector or selector-factory to ensure referential equality checks pass, preventing re-renders when data hasn't effectively changed.

3. Component Breakdown

3.1 src/ui/runtime/shell/RuntimeShell.tsx (Modification)

Responsibility:
Acts as the main layout frame for the gameplay session.

Changes:

Update standard CSS/Emotion styling to use display: flex; flex-direction: column;.

Wrap the existing children (Game Viewport) in a container with flex: 1.

Mount <RuntimeStatusBar /> as the last child.

Interface:
No change to public Props.

3.2 src/ui/runtime/shell/RuntimeStatusBar.tsx (New File)

Responsibility:
Layout container for the three status sections.

Logic:

Pure layout component.

Uses CSS Grid to distribute space:

Left: Resources (Auto width, Flex Wrap)

Center: Cave Stats (Auto width, Centered)

Right: Time Controls (Fixed/Auto)

Interface:

export const RuntimeStatusBar: React.FC = () => JSX.Element;

3.3 src/ui/runtime/status/ResourceItem.tsx (New File)

Responsibility:
Displays a single resource's state: Icon, Current Amount, and Net Rate.

Logic:

Input: Receives resourceId (string) and icon (String Key).

State: Selects current values from useRuntimeStore using runtime.getGlobal(resourceId).

Visuals:

Formats numbers (e.g., 1.2k).

Colors the "Rate" text (Green if positive, Red if negative, Grey if zero).

Interface:

interface ResourceItemProps {
resourceId: string; // Matches keys in src/data/schemas/assets.ts
icon: string; // key for AppIconRegistry
label?: string; // Optional tooltip/label
}
export const ResourceItem: React.FC<ResourceItemProps> = (props) => ...

3.4 src/ui/runtime/status/CaveStatus.tsx (New File)

Responsibility:
Displays the specific stats for the "Cave" (Home) entity.

Logic:

State: Connects to useRuntimeStore to access the Runtime instance.

Queries: Uses runtime.getWorld() or snapshot.query() to find the entity tagged as Player/Cave.

Selectors:

LevelComponent: Current Level.

ExperienceComponent: Current / Max.

HealthComponent: Current / Max.

CapacityComponent: Used / Total for Body, Mind, Social slots.

Rendering: Uses distinct "Gauges" or text stats for each metric.

Interface:

export const CaveStatus: React.FC = () => JSX.Element;

3.5 src/ui/runtime/status/RuntimeClock.tsx (New File)

Responsibility:
Displays game time and provides Play/Pause/Speed controls. Replaces TimeControlPanel.

Logic:

State: Connects to useRuntimeStore.

Selects runtime.state.tick for time display.

Selects runtime.timeScale (or equivalent global) for speed status.

Actions: Calls runtime.setTimeScale(0 | 1 | 2...).

Optimization: The formatted string HH:MM:SS (Day X) is generated inside the selector to avoid object churn.

Interface:

export const RuntimeClock: React.FC = () => JSX.Element;

3.6 src/ui/runtime/TimeControlPanel.tsx (Refactor/Delete)

Action:

Mark as Deprecated.

Remove from RuntimeShell.

Delete file once RuntimeClock is verified.

4. Implementation Plan

Scaffold: Create the new directory src/ui/runtime/status.

Atoms: Implement ResourceItem and its selectors using useRuntimeStore.

Complex: Implement CaveStatus with mock data selectors first, then real ECS queries via useRuntimeStore.

Time: Port logic from TimeControlPanel to RuntimeClock.

Assembly: Create RuntimeStatusBar and mount components.

Integration: Modify RuntimeShell to include the bar.

Cleanup: Delete TimeControlPanel.

5. Testing Strategy

5.1 Unit Tests (Vitest)

ResourceItem.test.tsx:

Mock useRuntimeStore with a partial Runtime implementation.

Assert that netRate > 0 renders green text.

Assert that netRate < 0 renders red text.

RuntimeClock.test.tsx:

Mock useRuntimeStore.

Clicking "Pause" calls setTimeScale(0).

Clicking "Fast Forward" calls setTimeScale(N).

5.2 Integration Checks

Layering Check: Verify via browser DevTools that opening EditorShell overlays the Status Bar completely.

Performance Check: Verify that "ticking" the game engine updates the numbers in the bar without triggering React commits for the entire RuntimeShell.
