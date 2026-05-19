Low-Level Design: Dockable Living Cards Polish

1. Overview

Why

The current dock-and-stay living cards lack visual polish and interactivity. They move too quickly to read during transit, stack rigidly in a fixed corner, use unstyled raw <div> elements, and cannot be dismissed by the player. Upgrading these to use the standard <Card> atom, slowing down their transit, randomizing their top-center placement, and allowing click-to-dismiss will vastly improve the UX and visual coherence of the game.

What

Visual Overhaul: Transition LivingCardPool from bare <div> elements to rendering the canonical <Card> component with a nested content target.

Simulation Upgrades: Extend the PoolNode state in livingCardsSimulation.ts to track target coordinates, dismissal state, and a dismissal timer.

Movement & Easing: Change the docking speed from a rapid linear velocity to a configurable ~3-second ease-out curve.

Spatial Clamping: Calculate target coordinates dynamically (top-center with random scatter) and clamp them to the window bounds using the actual DOM dimensions of the spawned card.

Interactivity: Bind native click event listeners within the rendering loop to trigger a smooth fade/scale dismissal animation before recycling the node.

How

The zero-render architecture of useLivingCardsLoop will be preserved. LivingCardPool will render the complex <Card> hierarchy once. useLivingCardsLoop will apply spatial transforms to the root wrapper ref, inject text/classes into a specific .living-card-content child, and attach one-time native click listeners to the wrappers. The simulation math will be updated to calculate the t (time) factor over a 3000ms window and apply a custom easing function to smoothly settle the cards into their calculated, clamped targetX/Y positions.

2. Simulation & State Definitions

2.1. Node State Updates

File: src/ui/runtime/world/living-cards/livingCardsSimulation.ts
Responsibility: Manage the mathematical state and lifecycles of floating/docking cards entirely independent of the DOM.
Logic Updates:

PoolNode Interface:

Add targetX: number and targetY: number.

Add isDismissing: boolean and dismissLife: number.

Constants:

Define DOCK_DURATION_MS = 3000.

Define DISMISS_DURATION_MS = 250.

createPoolNode Factory:

Initialize new fields (targetX: 0, targetY: 0, isDismissing: false, dismissLife: 0).

simulatePoolNodes Logic:

Dismissal State: If node.isDismissing is true:

Increment node.dismissLife += dt.

If node.dismissLife >= DISMISS_DURATION_MS, set node.active = false.

Note: The visual scaling calculation is deferred to the renderer. We only track lifecycle here.

continue to next node (skip standard movement).

Docking State (dock-and-stay):

Replace DOCK_SPEED math with duration-based interpolation: const t = Math.min(node.life / DOCK_DURATION_MS, 1).

Apply an ease-out function to t (e.g., cubic ease-out: 1 - Math.pow(1 - t, 3)).

Set currentX = startX + (targetX - startX) \* easedT.

Set currentY = startY + (targetY - startY) \* easedT.

Set node.opacity to fade in quickly over the first 300ms, then stay at 1.

When t === 1, set node.isDocked = true.

3. View Layer

3.1. React Component Overhaul

File: src/ui/runtime/world/living-cards/LivingCardPool.tsx
Responsibility: Render the static DOM pool for living cards, utilizing the standard <Card> atom.
Logic Updates:

DOM Structure: Instead of a bare <div className="living-card">, map over the indices to render:

An outer <div ref={...} className="living-card-wrapper">. This element receives the absolute positioning, opacity, transform, pointerEvents, and zIndex.

Inside the wrapper, render a <Card variant="surface" interactive padding="sm">.

Inside the <Card>, render <div className="living-card-content"></div>.

Styling:

The outer wrapper must have pointerEvents: "auto" so it can receive clicks, but only when active (toggled by the hook).

Ensure the wrapper has will-change: transform, opacity.

4. Controller & DOM Loop

4.1. DOM Manipulation & Event Binding

File: src/ui/runtime/world/living-cards/useLivingCardsLoop.ts
Responsibility: Bridge the mathematical simulation with the DOM, handling measurements, text injection, and interactions without triggering React re-renders.
Logic Updates:

Initialization (Event Listeners):

Inside the useEffect that initializes the loop, iterate through refs.current and attach a native click event listener to each wrapper element.

The listener callback retrieves the corresponding PoolNode by index. If node.active and !node.isDismissing, it sets node.isDismissing = true and node.dismissLife = 0.

Spawning (CardEventBridge Drain):

When popping a new event from the bridge and acquiring a free PoolNode:

Targeting DOM: Use element.querySelector('.living-card-content') to inject the message text. Set pointerEvents = "auto" on the wrapper for dockable cards.

Coordinate Generation & Clamping:

Base Target X: (window.innerWidth / 2) + (Math.random() - 0.5) \* 300.

Base Target Y: 20 + Math.random() \* 40.

Clamp X: Math.max(margin, Math.min(baseTargetX, window.innerWidth - element.offsetWidth - margin)).

Assign the clamped values to node.targetX and node.targetY.

Render Loop (Apply Styles):

During the requestAnimationFrame loop, apply the simulation state to the wrapper element.style.

If node.isDismissing is true, calculate a shrink scale: const scale = 1 - (node.dismissLife / DISMISS_DURATION_MS). Set transform: translate(...) scale(${scale}) and opacity: scale.

Otherwise, apply standard transform: translate3d(...) and opacity.

When a node becomes inactive, reset its pointerEvents to "none".

5. Testing Strategy

Following the canonical testing standards, testing will focus on behavior and isolation.

5.1. Simulation Unit Tests

File: src/ui/runtime/world/living-cards/livingCardsSimulation.test.ts

Happy Path (Docking Lerp):

Given: A newly initialized dock-and-stay PoolNode with startX=0, startY=0, targetX=100, targetY=100.

When: simulatePoolNodes is called with dt = 3000 (full duration).

Then: currentX and currentY strictly equal 100, opacity is 1, and isDocked is true.

Happy Path (Dismissal):

Given: An active PoolNode with isDismissing = true and dismissLife = 0.

When: simulatePoolNodes is called with dt = 250 (dismiss duration).

Then: node.active evaluates to false.

Edge Case (Partial Progress):

Given: A dock-and-stay PoolNode.

When: simulatePoolNodes is called with dt = 1500 (half duration).

Then: currentX and currentY are > 0 but < 100, accurately reflecting the cubic ease-out curve at t=0.5.

5.2. View Smoke Tests

File: src/ui/runtime/world/living-cards/LivingCardPool.smoke.test.tsx

DOM Structure Validation:

Given: The rendered LivingCardPool component within a test provider.

When: The component mounts.

Then: Query for the existence of .living-card-wrapper. Verify it contains a <Card> component (by checking for the expected styled-component classes or structure) and a .living-card-content child. Verify there are exactly 50 nodes pre-rendered.
