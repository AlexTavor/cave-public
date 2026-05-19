import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { resolveNodeOverlayModel } from "./resolveNodeOverlayModel";
import type { ResolvedNodeOverlayEntry } from "./nodeOverlayTypes";

export const resolveNodeOverlayEntries = (
    runtime: Runtime,
    entityById?: Map<string, RuntimeEntity>,
    showValues = true,
): ResolvedNodeOverlayEntry[] => {
    const entities = runtime.getEntities();
    const byId =
        entityById ??
        new Map(entities.map((entity) => [entity.id ?? "", entity] as const));
    return entities
        .flatMap((entity): ResolvedNodeOverlayEntry[] => {
            const model = resolveNodeOverlayModel(
                entity,
                runtime,
                byId,
                showValues,
            );
            return model ? [model] : [];
        })
        .sort((left, right) => left.entityId.localeCompare(right.entityId));
};
