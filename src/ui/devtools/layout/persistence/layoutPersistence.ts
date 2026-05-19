import type { ModuleCartridge } from "../../../../data/schemas/module";
import { resolveAuthoredWorldCoordinates } from "../../../../data/schemas/v2/worldPositionDefaults";
import type { Runtime } from "../../../../engine/runtime/Runtime";

export interface PositionUpdate {
    blueprintId: string;
    x: number;
    y: number;
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

export const harvestPositions = (runtime: Runtime): PositionUpdate[] => {
    const entities = runtime.getEntities();
    const updates: PositionUpdate[] = [];

    for (const entity of entities) {
        const entityId = entity.id;
        if (!entityId || entityId === "sys_world") continue;

        const body = runtime.getPhysicsBody(entityId);
        if (!body) continue;

        const { x, y } = body.position;
        if (!isFiniteNumber(x) || !isFiniteNumber(y)) continue;
        updates.push({
            blueprintId: entityId,
            ...resolveAuthoredWorldCoordinates(x, y),
        });
    }

    return updates;
};

const toNamespace = (filename: string) => filename.replace(/\.[^/.]+$/, "");

const resolveBlueprint = (
    draft: ModuleCartridge,
    filename: string,
    runtimeBlueprintId: string,
) => {
    const namespace = toNamespace(filename);
    for (const [key, blueprint] of Object.entries(draft.blueprints ?? {})) {
        const resolved = key.includes("::") ? key : `${namespace}::${key}`;
        if (
            resolved === runtimeBlueprintId ||
            blueprint.id === runtimeBlueprintId
        ) {
            return blueprint;
        }
    }
    return null;
};

export const applyLayoutBatch = (
    draft: ModuleCartridge,
    filename: string,
    updates: PositionUpdate[],
): boolean => {
    let changed = false;

    for (const update of updates) {
        const blueprint = resolveBlueprint(draft, filename, update.blueprintId);
        const presence = blueprint?._editor?.abilities?.worldPresence;
        if (!presence) continue;
        if (presence.x === update.x && presence.y === update.y) continue;
        presence.x = update.x;
        presence.y = update.y;
        changed = true;
    }

    return changed;
};

