import type { RuntimeCommand } from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEventInput } from "./runtimeNotificationTypes";
import { addPurgeMilestoneRuntimeEvents } from "./addPurgeMilestoneRuntimeEvents";
import {
    addRuntimeNotificationLifecycleEvents,
    pushRuntimeEventCount,
} from "./resolveRuntimeNotificationEventAccumulator";
import {
    isBodyEntity,
    isNotificationEligibleNode,
    normalizeDiscoveredLabel,
    resolveSpawnEntities,
} from "./resolveRuntimeNotificationEvents.helpers";
import { resolveConditionalActivationUnlocks } from "./resolveRuntimeNotificationUnlocks";

const addSpawnEvents = (
    items: Map<string, RuntimeEventInput>,
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
) => {
    const spawns = resolveSpawnEntities(
        commands,
        previousSnapshot,
        currentSnapshot,
    );
    for (const { entity, entityId, label } of spawns) {
        if (isBodyEntity(entity)) {
            pushRuntimeEventCount(items, {
                kind: "body_added",
                aggregationKey: "body_added",
                count: 1,
            });
        }
        if (!isNotificationEligibleNode(currentSnapshot, entity)) continue;
        pushRuntimeEventCount(items, {
            kind: "entity_discovered",
            aggregationKey: `entity_discovered:${normalizeDiscoveredLabel(label)}`,
            count: 1,
            entityId,
            entityLabel: label,
        });
    }
};

export const resolveRuntimeNotificationEvents = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
): RuntimeEventInput[] => {
    const items = new Map<string, RuntimeEventInput>();
    addSpawnEvents(items, commands, previousSnapshot, currentSnapshot);
    resolveConditionalActivationUnlocks(
        previousSnapshot,
        currentSnapshot,
    ).forEach((item) => pushRuntimeEventCount(items, item));
    addRuntimeNotificationLifecycleEvents(
        items,
        commands,
        previousSnapshot,
        currentSnapshot,
    );
    addPurgeMilestoneRuntimeEvents(items, commands);
    return [...items.values()];
};
