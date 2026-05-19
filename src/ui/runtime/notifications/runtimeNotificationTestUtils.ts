import { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommandMetadata,
    type SpawnCommand,
} from "../../../engine/runtime/types";

export const makeSnapshot = (
    entities: any[],
    blueprints: Record<string, any> = {},
) =>
    new Snapshot(
        [{ id: "sys_world", state: {} }, ...entities],
        { getBody: () => undefined } as any,
        blueprints,
    );

export const makeEligibleBlueprint = (
    ability: "cycle" | "assignment",
    extraAbilities: Record<string, unknown> = {},
) => ({
    _editor: { abilities: { [ability]: {}, ...extraAbilities } },
});

export const makeSpawnCommand = (
    id: string,
    blueprintId: string,
    metadata?: RuntimeCommandMetadata,
): SpawnCommand => ({
    type: RuntimeCommandType.SPAWN,
    payload: { id, blueprintId },
    ...(metadata ? { metadata } : {}),
});
