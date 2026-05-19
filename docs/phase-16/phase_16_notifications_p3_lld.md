Low-Level Design: Purge Narrative Milestones

1. Overview

Why

As the purge_progress advances, the game must narratively communicate the escalating threat to the player. Relying solely on a progress bar lacks atmospheric tension. By dispatching critical narrative notifications at specific progression milestones, the game builds dread and informs the player of the impending threat organically.

A dedicated editor interface is required to empower designers to configure these milestones, thresholds, and message pools safely, with clear tooltips and validation, ensuring they don't break the configuration.

What

Configuration Schema: The GameConfig schema is extended to include a milestones array within the purge section. Each milestone defines a fractional threshold (e.g., 0.3) and a pool of text messages.

State Tracking: The system will use the sys_world entity's state component to track which milestones have been triggered (e.g., setting a purge_milestone_0.3 flag to 1).

Purge Narrative System: A new runtime system that observes sys_world.state.purge_progress, compares it against the configured milestones, and dispatches a random message from the corresponding milestone pool using a deterministic PRNG.

Commands Emitted: The system will emit a SHOW_CUSTOM_NOTIFICATION command to render the text, and an UPDATE_STATE command to persist the milestone completion flag.

Editor UI: A bespoke set of editor components (PurgeMilestonesEditor and MilestoneRuleForm) to manage the milestones array, utilizing the established design patterns of the NotificationsEditor, complete with SmartTooltip integrations for designer guidance.

How

The PurgeNarrativeSystem runs every tick. It calculates the ratio of purge*progress.value to purge_progress.max. It checks the sys_config for any milestones where ratio >= milestone.threshold. If a matching milestone is found, it queries sys_world.state to see if the flag purge_milestone*{threshold} exists. If it does not exist, the system selects a message deterministically, fires the custom notification command, and immediately fires the state update command to prevent re-triggering. The Editor UI uses the existing useSessionStore hooks to mutate the GameConfig safely.

2. Schema & Type Definitions

2.1. Game Config Update

File: src/data/schemas/game/config.ts
Responsibility: Extend the global game configuration to hold narrative milestones.
Interface & Logic:

Define PurgeMilestoneSchema: an object containing:

id: A unique string identifier.

threshold: A number (0.0 to 1.0) representing the percentage of purge progress. Include a detailed description for tooltips (e.g., "The fraction of the total purge progress required to trigger this narrative event.").

messages: An array of strings representing the narrative lines. Include a description (e.g., "A pool of messages. One will be randomly selected when the threshold is reached.").

Modify the PurgeConfigSchema to include an optional milestones array of PurgeMilestoneSchema.

Export the inferred TypeScript types PurgeMilestone and update PurgeConfig.

Ensure DEFAULT_GAME_CONFIG is updated with an empty milestones array.

3. System Implementation

3.1. Purge Narrative System

File: src/game/systems/cave/PurgeNarrativeSystem.ts (New)
Responsibility: Monitor purge progress and dispatch narrative notifications when thresholds are crossed.
Interface: Implements Tickable<void>.

constructor(config: GameConfig)

Logic:

Query: Retrieve sys_world from the snapshot.getEntities(). If it doesn't exist, return early.

Extract Progress: Read sys_world.state?.purge_progress. If missing value or max, return early. Calculate ratio = value / max.

Evaluate Milestones: Iterate through config.purge.milestones (if defined).

Check Threshold: For each milestone, if ratio >= milestone.threshold:

Construct the state key: purge*milestone*{milestone.id}.

Check Flag: Look up sys_world.state[flagKey]. If it is truthy/exists, continue to the next milestone (already triggered).

Select Message: Use pseudoRandom from src/utils/pseudoRandom.ts with a deterministic seed (e.g., {snapshot.seed}_purge_{milestone.id}) to pick an index from the milestone.messages array.

Enqueue Notification: Push a SHOW_CUSTOM_NOTIFICATION command to the commands buffer.

Payload: presentation: { type: "dock-and-stay", severity: "critical", message: selectedMessage }.

Enqueue State Update: Push an UPDATE_STATE command to the commands buffer.

Payload: entityId: "sys_world", key: flagKey, value: 1.

Break/Return: To avoid spamming multiple milestones in a single tick if the progress jumped massively, break out of the loop after firing the highest/first eligible milestone.

3.2. Registry Integration

File: src/engine/runtime/RuntimeSystemsRegistry.ts
Responsibility: Add the new system to the engine's execution loop.
Logic:

Instantiate PurgeNarrativeSystem with the active cartridge.config.game_config.

Add it to the registeredSystems array alongside other progression/cave systems.

4. Editor UI Implementation

4.1. Purge Milestones Editor

File: src/ui/devtools/editors/config/purge/PurgeMilestonesEditor.tsx (New)
Responsibility: Renders the list of configured milestones and provides controls to add new ones.
Interface: (props: { filename: string }) => JSX.Element
Logic:

Utilize useModuleSession to access the draft GameConfig.

Render a header with a SmartTooltip explaining the milestone system.

Render an "Add Milestone" button that appends a default milestone object to draft.config.game_config.purge.milestones.

Map over the existing milestones and render a PurgeMilestoneForm for each.

4.2. Purge Milestone Form

File: src/ui/devtools/editors/config/purge/PurgeMilestoneForm.tsx (New)
Responsibility: Form to edit a single milestone's threshold and message pool.
Interface: (props: { filename: string; index: number; onRemove: () => void }) => JSX.Element
Logic:

Extract the specific milestone using the provided index.

Render a SliderField (or NumberField with min 0, max 1, step 0.01) bound to the milestone's threshold path. Wrap its label in a SmartTooltip referencing the schema description.

Render an ArrayField (or custom string array editor) bound to the messages path to allow adding/removing text strings. Wrap its label in a SmartTooltip.

Render a generic delete/remove button mapped to onRemove.

All changes must utilize the module session's updateDraft function to ensure immutability and history tracking.

4.3. Game Config Editor Integration

File: src/ui/devtools/editors/config/GameConfigEditor.tsx
Responsibility: Serve as the root view for game configurations.
Logic:

Import and render PurgeMilestonesEditor inside the existing layout, passing down the filename prop.

5. Testing Strategy

Following the canonical testing standards, testing will focus on behavior, isolation, and deterministic execution.

5.1. Unit Tests (PurgeNarrativeSystem)

File: src/game/systems/cave/PurgeNarrativeSystem.test.ts (New)

Happy Path (Threshold Reached):

Given: A mock GameConfig with a milestone at 0.3, and a Snapshot containing a sys_world entity where purge_progress is at 30 / 100. The state does not contain the milestone flag.

When: The PurgeNarrativeSystem is ticked.

Then: The CommandBuffer contains exactly two commands: one SHOW*CUSTOM_NOTIFICATION with a deterministic text from the pool, and one UPDATE_STATE targeting sys_world with key purge_milestone*{id} and value 1.

Negative Path (Already Triggered):

Given: The same configuration, but sys*world.state already contains purge_milestone*{id}: { value: 1 }.

When: The system is ticked.

Then: The CommandBuffer remains empty.

Edge Cases (Missing Data):

Given: A sys_world entity missing the purge_progress entirely, or missing the milestones array in the config.

When: The system is ticked.

Then: The system safely NOOPs without throwing exceptions. The CommandBuffer remains empty.

Edge Cases (Division by Zero):

Given: A sys_world entity where purge_progress.max is 0.

When: The system is ticked.

Then: The system safely NOOPs without throwing exceptions.

5.2. Editor Smoke Tests

File: src/ui/devtools/editors/config/purge/PurgeMilestonesEditor.smoke.test.tsx (New)

Happy Path (Render and Interaction):

Given: A mock ModuleSession initialized with an empty milestones array.

When: The PurgeMilestonesEditor is rendered within the ThemeProvider and PortalManager.

Then: The "Add Milestone" button renders successfully without errors.

Happy Path (Addition and Data Binding):

Given: The rendered PurgeMilestonesEditor.

When: The "Add Milestone" button is clicked.

Then: A new PurgeMilestoneForm appears on screen. The underlying ModuleSession draft is verified to contain exactly one new milestone object with default values.

Negative Path (Render Stability on Deep Edit):

Given: A mocked session containing a pre-existing milestone with messages.

When: A user types into a message input field inside PurgeMilestoneForm.

Then: The React component updates the draft state without throwing render loop errors or losing focus. Tooltips remain accessible upon hover.
