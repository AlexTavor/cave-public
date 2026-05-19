LLD: Living Cards Notification System

This document outlines the Low-Level Design for the Living Cards system. It establishes a high-performance, diegetic notification system for the bio-factory tamagotchi simulation. It enforces zero React render thrashing, strict ECS boundary separation, and guarantees accurate spatial coordinates for destroyed entities using a pre-apply snapshot.

1. Data Schema Layer (The Knobs)

Notifications are defined in the Cartridge as rules. We introduce a schema to map a specific RuntimeCommand to a visual event, evaluating conditions against the state of the entity involved.

1.1 src/data/schemas/notifications.ts (New)

Responsibility: Define the schema for a data-driven notification rule.

Logic/Schema Details:

trigger: The RuntimeCommandType that fires this rule (e.g., "KILL", "TRANSFER_ASSETS").

subjectKey: The key in the command's payload that contains the relevant entity ID (e.g., "entityId" for KILL, "targetId" for TRANSFER_ASSETS).

conditions: An array of LogicRuleSchema (from logic.ts) evaluated against the subject entity.

presentation: Defines type ("float-and-fade" | "dock-and-stay"), message (a template string like "+{amount} {resource}"), icon (optional string), and severity ("info" | "warn" | "error" | "critical").

coalesce: A boolean indicating if multiple triggers on the same entity in a single tick should be aggregated.

Interface:

export const NotificationRuleSchema = z.object({ ... });
export type NotificationRule = z.infer<typeof NotificationRuleSchema>;

1.2 src/data/schemas/v2/config.ts

Responsibility: Attach the notification rules to the global system configuration.

Logic: Add notifications: z.array(NotificationRuleSchema).default([]) to the SysConfigSchema.

2. Engine Orchestration Layer

To provide the UI with the exact location of an entity before it is destroyed or modified, the engine must thread the previousSnapshot through the tick phases and emit successfully applied commands.

2.1 src/engine/runtime/CommandsManager.ts

Responsibility: Execute buffered commands and return the processed batch.

Logic: Inside process(), iterate over the drained commands. Because handlers mutate in-place and don't return success/failure, capture all drained commands that have a registered handler and return them.

Interface Delta:

public process(context: CommandHandlerContext): RuntimeCommand[]

2.2 src/engine/runtime/createGameRuntime.ts & src/engine/runtime/handlers/types.ts

Responsibility: Expose a telemetry hook to emit applied commands and the previousSnapshot.

Logic: Add an optional onCommandsApplied function to RuntimeTelemetryAdapter and CommandHandlerContext['telemetry'].

Interface Delta:

onCommandsApplied?: (commands: RuntimeCommand[], previousSnapshot: Snapshot) => void;

2.3 src/engine/runtime/runtimePhases.ts

Responsibility: Modify the applyPhase to capture commands and invoke the telemetry hook.

Logic: Add previousSnapshot: Snapshot | null as a parameter. Call context.commandsManager.process(context.commandContext). If previousSnapshot and the onCommandsApplied hook exist, invoke the hook with the processed commands and the previousSnapshot.

2.4 src/engine/runtime/runtimeTick.ts

Responsibility: Manage the multi-step while loop, correctly advancing the previousSnapshot for each internal sub-step.

Logic: 1. Add previousSnapshot: Snapshot | null as an argument. 2. Declare let loopPrevSnapshot = previousSnapshot; before the while loop. 3. Inside the loop, pass loopPrevSnapshot into applyPhase. 4. Generate the new snapshot via snapshotPhase. 5. Assign loopPrevSnapshot = newSnapshot. 6. Return loopPrevSnapshot alongside the automationSnapshot in the callback to update the core state.

2.5 src/engine/runtime/RuntimeCore.ts

Responsibility: Maintain the authoritative previousSnapshot across frames.

Logic: 1. Add protected previousSnapshot: Snapshot | null = null;. 2. In tick(), pass this.previousSnapshot into runRuntimeTick. 3. Update this.previousSnapshot = fullSnapshot in the setSnapshots callback. 4. Set this.previousSnapshot = null in reset().

3. UI Translation Layer (The Evaluator)

This layer intercepts the engine events, evaluates the data-driven rules using JsonLogicAdapter, templates the strings, and buffers the DOM updates.

3.1 src/ui/runtime/world/living-cards/CardEventBridge.ts

Responsibility: A React-agnostic mutable queue holding validated visual events.

Logic: Expose a singleton with an array of LivingCardEvent objects, push(), and drain().

Interface:

export interface LivingCardEvent {
id: string;
type: "float-and-fade" | "dock-and-stay";
message: string;
severity: "info" | "warn" | "error" | "critical";
startX: number;
startY: number;
}
export const CardEventBridge = { queue: [], push: (e) => void, drain: () => [] };

3.2 src/ui/runtime/world/living-cards/templateString.ts

Responsibility: Replace {key} placeholders in strings with object values.

Logic: Accept a template string and a Record<string, unknown>. Use regex to replace {key} with String(record[key] ?? "").

3.3 src/ui/runtime/world/living-cards/NotificationEvaluator.ts

Responsibility: Evaluate Cartridge notification rules against applied commands and previousSnapshot.

Logic:

Accept commands: RuntimeCommand[], previousSnapshot: Snapshot, and rules: NotificationRule[].

Instantiate a transient JsonLogicAdapter and ValueResolver.

For each command:

Find rules where rule.trigger === command.type.

Extract entityId using rule.subjectKey against command.payload.

Retrieve entity = previousSnapshot.getEntity(entityId) and body = previousSnapshot.getPhysicsBody(entityId). If either is missing, continue to next rule (do not spawn a card if we lack physical coordinates).

Evaluate rule.conditions against entity. If false, continue.

Flatten the context data for templating: { ...command.payload, ...entity.state }.

Apply templateString to rule.presentation.message.

Coalesce: If rule.coalesce is true, group matching events by (rule.id, entityId) and append a (xN) multiplier to the message string.

Push the resulting events to CardEventBridge.push().

Synchronously call useTelemetryStore.getState().log("tick", message, severity).

Interface:

export const evaluateNotifications = (
commands: RuntimeCommand[],
previousSnapshot: Snapshot,
rules: NotificationRule[]
): void;

3.4 src/ui/runtime/state/runtimeStoreHelpers.ts

Logic: Update the telemetry adapter injected into createGameRuntime. When onCommandsApplied fires, extract rules = getStore().runtime?.getCartridge().blueprint?.settings?.notifications ?? [] and invoke evaluateNotifications(commands, previousSnapshot, rules).

4. DOM Pool & Animation Layer

Manages the hardware-accelerated CSS rendering using a pre-allocated array of generic nodes.

4.1 src/ui/runtime/world/living-cards/livingCardsSimulation.ts

Responsibility: Pure mathematical simulation of node trajectories.

Logic:

Accept nodes: PoolNode[] and dt: number.

For each active node, increment life += dt.

float-and-fade: Apply an ease-out to currentY relative to startY. Apply an ease-in to opacity. If life > maxLife, set active = false.

dock-and-stay: Lerp currentX/Y towards a fixed offset (e.g., top-right UI bounds). Set isDocked = true upon arrival.

Interface:

export const simulatePoolNodes = (nodes: PoolNode[], dt: number): void;

4.2 src/ui/runtime/world/living-cards/useLivingCardsLoop.ts

Responsibility: Drive the RAF loop for DOM updates.

Logic:

Maintain a local array of PoolNode objects (e.g., size 50).

Inside a requestAnimationFrame loop:

CardEventBridge.drain(). Find inactive PoolNodes and initialize their startX, startY, currentX, currentY, and life. Imperatively set node.element.textContent = event.message.

Call simulatePoolNodes(activeNodes, dt).

Iterate activeNodes and write element.style.transform = "translate(${currentX}px, ${currentY}px)" and element.style.opacity = opacity.

Interface:

export const useLivingCardsLoop = (refs: React.MutableRefObject<(HTMLElement | null)[]>): void;

4.3 src/ui/runtime/world/living-cards/LivingCardPool.tsx

Responsibility: Render the fixed DOM structure once.

Logic:

Initialize a useRef array of length 50.

Call useLivingCardsLoop(refs).

Render <Portal layer="float"> with an absolute container (pointerEvents: "none").

Map 50 <div className="living-card"> elements, assigning the ref and initializing opacity: 0, position: 'absolute', willChange: 'transform, opacity'.

5. Visual Editor for Notifications (UI Layer)

To strictly enforce a data-driven approach, the system relies on a fully interactive React editor to create and manage the notification rules inside the Cartridge payload.

5.1 Routing & Window Manager Integration

src/ui/devtools/shell/window-manager/virtualPath.types.ts: Add { kind: "notifications"; filename: string } to the VirtualPath union. Add "notifications" to ROUTE_PREFIXES.

src/ui/devtools/shell/window-manager/tabIds.ts: Add a case in TabIdParams and makeTabId to generate notifications:${filename}.

src/ui/devtools/shell/window-manager/hooks/useWindowManagerRouteHandlers.config.ts: Register a handler to open the "Notifications Editor" tab when the notifications virtual path is encountered.

src/ui/devtools/shell/window-manager/WindowLayoutResolver.configEditors.tsx: Map the notifications component id to the new <NotificationsEditor filename={filename} /> component.

5.2 Editor State Management

src/ui/devtools/editors/config/notifications/useNotificationsSession.ts (New):

Responsibility: Manage the local draft state of the blueprint.settings.notifications array and commit changes to the VFS via useModuleSession.

Logic: Provide rules, addRule, updateRule(index, rule), removeRule(index), and commit() functions.

Interface: Returns the current draft rules and the mutator functions.

5.3 Autocomplete Support

src/ui/devtools/editors/config/notifications/useNotificationAutocomplete.ts (New):

Responsibility: Provide context-aware suggestions for templating in the message field and logic in the conditions field.

Logic: Based on the currently selected trigger type (e.g., TRANSFER_ASSETS), return an array of valid payload {variables} (like {amount}, {resource}) by extracting keys from the respective payload interface. Also suggest standard entity paths via existing schemaIntrospection.

Interface: (triggerType: string, input: string) => Suggestion[]

5.4 Editor Components

src/ui/devtools/editors/config/notifications/NotificationsEditor.tsx (New):

Responsibility: Root editor view wrapping the ToolFrame. Displays a list of NotificationRuleCard components and an "Add Notification" button.

src/ui/devtools/editors/config/notifications/NotificationRuleForm.tsx (New):

Responsibility: The custom form for a single NotificationRule.

Logic: Renders a vertical layout of inputs:

Trigger Type: EnumField mapped to RuntimeCommandType. Wrapped in SmartTooltip.

Subject Key: AutocompleteStringField suggesting common keys. Wrapped in SmartTooltip.

Conditions: Reuse the existing ConditionsField component. Wrapped in SmartTooltip.

Presentation Message: AutocompleteStringField hooked up to useNotificationAutocomplete. Wrapped in SmartTooltip.

Presentation Icon: IconPicker component. Wrapped in SmartTooltip.

Presentation Type & Severity: EnumField components. Wrapped in SmartTooltip.

Coalesce: BooleanField. Wrapped in SmartTooltip.

Constraint: EVERY interactive element (labels, inputs, buttons) must be enclosed within a <SmartTooltip content="..."> explaining its behavior.

6. Testing Strategy

Unit Test (NotificationEvaluator.test.ts):

Given: A SysConfig with a TRANSFER_ASSETS rule using {amount} templating and coalescing set to true.

When: evaluateNotifications receives three identical TRANSFER_ASSETS commands targeted at the same entityId.

Then: Verify CardEventBridge receives exactly one event with a coalesced multiplier in the message. Verify Telemetry was called.

Given: A command targeting an ID not present in the previousSnapshot.

Then: Verify no event is pushed to the bridge.

Unit Test (livingCardsSimulation.test.ts):

Given: An active float-and-fade node at life: 0.

When: Step simulation by 500ms.

Then: Assert currentY is strictly less than startY (moving up) and opacity is strictly less than 1.0.

Integration Test (runtimePhases.test.ts):

Given: A command buffer with a valid command.

When: runRuntimeTick cycles through the phases.

Then: The onCommandsApplied telemetry hook receives an array of commands and the correctly preserved previousSnapshot.

Unit Test (useNotificationsSession.test.ts):

Given: A mock useModuleSession.

When: addRule is invoked followed by commit().

Then: The resulting SysConfig payload contains the new default notification rule.

Smoke Test (NotificationsEditor.test.tsx):

Given: A valid context with a predefined notification rule.

When: The component is rendered.

Then: Ensure it renders without crashing and visually displays the existing rule's presentation message.
