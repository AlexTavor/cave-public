import {
    RuntimeCommandType,
    readCommandCause,
    type RuntimeCommand,
    type RuntimeEntity,
} from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { RuntimeEventInput } from "./runtimeNotificationTypes";
import { isBodyEntity } from "./resolveRuntimeNotificationEvents.helpers";

const readKilledBody = (snapshot: Snapshot, command: RuntimeCommand) => {
    if (command.type !== RuntimeCommandType.KILL) return null;
    const entity = snapshot.getEntity(command.payload.entityId);
    return entity && isBodyEntity(entity as RuntimeEntity)
        ? (entity as RuntimeEntity)
        : null;
};

export const pushRuntimeEventCount = (
    map: Map<string, RuntimeEventInput>,
    item: RuntimeEventInput,
) => {
    const existing = map.get(item.aggregationKey);
    map.set(item.aggregationKey, {
        ...item,
        count: (existing?.count ?? 0) + item.count,
        level: item.level ?? existing?.level,
        entityId: item.entityId ?? existing?.entityId,
        entityLabel: item.entityLabel ?? existing?.entityLabel,
    });
};

const addKillEvents = (
    items: Map<string, RuntimeEventInput>,
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
) => {
    let starved = 0;
    let purged = 0;
    let died = 0;
    for (const command of commands) {
        if (!readKilledBody(previousSnapshot, command)) continue;
        const cause = readCommandCause(command);
        if (cause === "starvation") starved += 1;
        else if (cause === "purge") purged += 1;
        else died += 1;
    }
    if (starved > 0)
        pushRuntimeEventCount(items, {
            kind: "body_starved",
            aggregationKey: "body_starved",
            count: starved,
        });
    if (purged > 0)
        pushRuntimeEventCount(items, {
            kind: "body_purge_kill",
            aggregationKey: "body_purge_kill",
            count: purged,
        });
    if (died > 0)
        pushRuntimeEventCount(items, {
            kind: "body_died",
            aggregationKey: "body_died",
            count: died,
        });
};

const addBodyUpdateEvents = (
    items: Map<string, RuntimeEventInput>,
    commands: RuntimeCommand[],
) => {
    for (const command of commands) {
        if (command.type !== RuntimeCommandType.UPDATE_BODIES_BATCH) continue;
        for (const update of command.payload.updates) {
            if (typeof update.level !== "number") continue;
            pushRuntimeEventCount(items, {
                kind: "body_level_up",
                aggregationKey: `body_level_up:${update.level}`,
                count: 1,
                level: update.level,
            });
        }
    }
};

export const addRuntimeNotificationLifecycleEvents = (
    items: Map<string, RuntimeEventInput>,
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    _currentSnapshot: Snapshot,
) => {
    addKillEvents(items, commands, previousSnapshot);
    addBodyUpdateEvents(items, commands);
};
