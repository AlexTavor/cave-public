import {
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeEntity,
} from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";

export const readNotificationEntityLabel = (entity: RuntimeEntity) => {
    const displayLabel = (entity as { display?: { label?: unknown } }).display
        ?.label;
    if (typeof displayLabel === "string" && displayLabel.trim())
        return displayLabel.trim();
    if (typeof entity.label === "string" && entity.label.trim())
        return entity.label.trim();
    return entity.id ?? "unknown";
};

export const normalizeDiscoveredLabel = (label: string) =>
    label.trim().toLowerCase();
export const readCounterDelta = (
    prev: Snapshot,
    current: Snapshot,
    key: string,
) => Math.max(0, current.getGlobal(key) - prev.getGlobal(key));
export const isBodyEntity = (entity: RuntimeEntity) =>
    Boolean((entity as { body?: unknown }).body);

const hasNotificationAbility = (abilities: Record<string, unknown>) =>
    Object.hasOwn(abilities, "cycle") || Object.hasOwn(abilities, "assignment");

export const isNotificationEligibleNode = (
    snapshot: Snapshot,
    entity: RuntimeEntity,
) => {
    const blueprintId =
        typeof entity.blueprintId === "string" ? entity.blueprintId.trim() : "";
    if (!blueprintId) return false;
    const abilities = snapshot.getBlueprint(blueprintId)?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    return abilities ? hasNotificationAbility(abilities) : false;
};

export const resolveSpawnEntities = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
) => {
    const previousIds = new Set(
        previousSnapshot
            .getEntities()
            .map((entity) => entity.id)
            .filter(Boolean),
    );
    const byBlueprint = new Map<string, RuntimeEntity[]>();
    for (const entity of currentSnapshot.getEntities()) {
        if (!entity.id || previousIds.has(entity.id)) continue;
        const blueprintId =
            typeof entity.blueprintId === "string" ? entity.blueprintId : "";
        const group = byBlueprint.get(blueprintId) ?? [];
        group.push(entity as RuntimeEntity);
        byBlueprint.set(blueprintId, group);
    }
    return commands.flatMap((command) => {
        if (command.type !== RuntimeCommandType.SPAWN) return [];
        const direct = command.payload.id
            ? currentSnapshot.getEntity(command.payload.id)
            : undefined;
        const entity =
            direct ?? byBlueprint.get(command.payload.blueprintId)?.shift();
        return entity
            ? [
                  {
                      command,
                      entity: entity as RuntimeEntity,
                      entityId: entity.id,
                      label: readNotificationEntityLabel(
                          entity as RuntimeEntity,
                      ),
                  },
              ]
            : [];
    });
};
