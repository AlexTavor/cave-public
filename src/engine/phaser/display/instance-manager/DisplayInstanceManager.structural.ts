import { coerceBlueprintId } from "../../../runtime/blueprintId";
import type { Runtime } from "../../../runtime/Runtime";
import type { RuntimeEntity } from "../../../runtime/types";
import { resolveDisplayStaticSpec } from "../resolve-display/resolveDisplaySpec";
import type {
    DisplayStructuralRecord,
    DisplayStructureSyncState,
} from "../types";

const updateRecord = (
    runtime: Runtime,
    entity: RuntimeEntity,
): DisplayStructuralRecord | null => {
    const cartridge = runtime.getCartridge();
    const blueprintId = coerceBlueprintId(entity.blueprintId);
    const staticSpec = resolveDisplayStaticSpec({
        entity,
        blueprint: blueprintId ? cartridge.blueprints[blueprintId] : undefined,
        styles: cartridge.assets?.styles ?? {},
        displays: cartridge.assets?.displays ?? {},
        blueprints: cartridge.blueprints,
    });
    return staticSpec
        ? { entityId: staticSpec.entityId, entity, staticSpec }
        : null;
};

const syncEntity = (
    runtime: Runtime,
    entityId: string,
    entity: RuntimeEntity | null,
    records: Map<string, DisplayStructuralRecord>,
    destroyInstance: (entityId: string) => void,
) => {
    if (!entity) {
        records.delete(entityId);
        destroyInstance(entityId);
        return;
    }
    const next = updateRecord(runtime, entity);
    if (!next) {
        records.delete(entityId);
        destroyInstance(entityId);
        return;
    }
    records.set(entityId, next);
};

const syncFullRebuild = (
    runtime: Runtime,
    records: Map<string, DisplayStructuralRecord>,
    destroyInstance: (entityId: string) => void,
) => {
    const seen = new Set<string>();
    runtime.getEntities().forEach((entity) => {
        const entityId = entity.id ?? "";
        syncEntity(runtime, entityId, entity, records, destroyInstance);
        seen.add(entityId);
    });
    [...records.keys()]
        .filter((id) => !seen.has(id))
        .forEach((id) =>
            syncEntity(runtime, id, null, records, destroyInstance),
        );
};

export const syncDisplayStructure = (input: {
    runtime: Runtime;
    records: Map<string, DisplayStructuralRecord>;
    destroyInstance: (entityId: string) => void;
    syncState: DisplayStructureSyncState;
}) => {
    const { runtime, records, destroyInstance, syncState } = input;
    const invalidation = runtime.getInvalidation?.();
    if (!invalidation) {
        syncFullRebuild(runtime, records, destroyInstance);
        syncState.runtime = runtime;
        return;
    }
    const worldRevision = invalidation.getWorldRevision();
    const entityListRevision = invalidation.getEntityListRevision();
    const blueprintRevision = invalidation.getBlueprintRevision();
    const mutationRevision = invalidation.getMutationRevision();
    const fullRebuild =
        syncState.runtime !== runtime ||
        syncState.worldRevision !== worldRevision ||
        syncState.entityListRevision !== entityListRevision ||
        syncState.blueprintRevision !== blueprintRevision;
    if (fullRebuild) syncFullRebuild(runtime, records, destroyInstance);
    else if (syncState.mutationRevision !== mutationRevision) {
        invalidation
            .getLastChangedEntityIds()
            .forEach((id) =>
                syncEntity(
                    runtime,
                    id,
                    runtime.getEntity(id) ?? null,
                    records,
                    destroyInstance,
                ),
            );
    }
    Object.assign(syncState, {
        runtime,
        worldRevision,
        entityListRevision,
        blueprintRevision,
        mutationRevision,
    });
};
