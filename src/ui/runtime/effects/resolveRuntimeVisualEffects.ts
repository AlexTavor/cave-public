import {
    readDeadBodyPresentation,
    RuntimeCommandType,
    type RuntimeCommand,
    type RuntimeEntity,
} from "../../../engine/runtime/types";
import type { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    isBodyEntity,
    resolveSpawnEntities,
} from "../notifications/resolveRuntimeNotificationEvents.helpers";
import type { RuntimeVisualEvent } from "./runtimeVisualEvents";
import { collectBodyDeaths } from "./runtimeVisualBodyDeaths";
import { resolvePointerAssignmentVisualEffects } from "./resolvePointerAssignmentVisualEffects";

const hasTag = (entity: RuntimeEntity, tag: string) => {
    const tagSet = new Set<string>();
    for (const value of (entity as { tags?: string[] }).tags ?? []) {
        if (value) tagSet.add(value);
    }
    return tagSet.has(tag) || tagSet.has(`[${tag}]`);
};
const hasResolvedBody = (
    entity: RuntimeEntity,
    snapshot: Snapshot,
): entity is RuntimeEntity & { id: string } =>
    Boolean(entity.id && snapshot.getPhysicsBody(entity.id));

const resolveSpawnEffects = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
) =>
    resolveSpawnEntities(commands, previousSnapshot, currentSnapshot)
        .map(({ entity }) => entity)
        .filter((entity) => hasTag(entity, "anim:spawn"))
        .filter((entity): entity is RuntimeEntity & { id: string } =>
            hasResolvedBody(entity, currentSnapshot),
        )
        .map<RuntimeVisualEvent>((entity) => {
            const body = currentSnapshot.getPhysicsBody(entity.id);
            if (!body) {
                throw new Error(
                    `[resolveRuntimeVisualEffects] Missing body for '${entity.id}'.`,
                );
            }
            return {
                kind: "spawn_gold_rings",
                entityId: entity.id,
                x: body.x,
                y: body.y,
                radius: body.radius,
            };
        });

const resolveKillEffects = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
) => {
    const bodyDeaths = collectBodyDeaths(commands, previousSnapshot).map(
        ({ entityId, x, y, radius, cause }) => ({
            kind: "kill_smoke_puff" as const,
            entityId,
            x,
            y,
            radius,
            cause,
        }),
    );
    const shouldShakeOnBodyDeath = bodyDeaths.length > 0;
    const taggedKills = commands.flatMap<RuntimeVisualEvent>((command) => {
        if (command.type !== RuntimeCommandType.KILL) return [];
        const entity = previousSnapshot.getEntity(command.payload.entityId) as
            | RuntimeEntity
            | undefined;
        const body =
            readDeadBodyPresentation(command) ??
            previousSnapshot.getPhysicsBody(command.payload.entityId);
        if (
            !entity ||
            !body ||
            isBodyEntity(entity) ||
            !hasTag(entity, "anim:kill")
        ) {
            return [];
        }
        return [
            {
                kind: "kill_smoke_puff",
                entityId: command.payload.entityId,
                x: body.x,
                y: body.y,
                radius: body.radius,
            },
        ];
    });
    return [
        ...bodyDeaths,
        ...taggedKills,
        ...(shouldShakeOnBodyDeath
            ? [{ kind: "body_death_camera_shake" as const }]
            : []),
    ];
};

export const resolveRuntimeVisualEffects = (
    commands: RuntimeCommand[],
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
): RuntimeVisualEvent[] => [
    ...resolveSpawnEffects(commands, previousSnapshot, currentSnapshot),
    ...resolveKillEffects(commands, previousSnapshot),
    ...resolvePointerAssignmentVisualEffects(
        commands,
        previousSnapshot,
        currentSnapshot,
    ),
];
