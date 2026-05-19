import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { resolveBlueprintById } from "../selectionUtils/entity";

const readSlots = (assignment: unknown): number | undefined => {
    const slots = (assignment as { slots?: unknown } | undefined)?.slots;
    return typeof slots === "number" ? slots : undefined;
};

export const resolveAssignmentSlots = (
    runtime: Runtime,
    entity?: RuntimeEntity,
    fallbackEntity?: RuntimeEntity,
): number => {
    const liveSlots = readSlots(
        entity && runtime.getEntity(entity.id ?? "")?.assignment,
    );
    const currentSlots = readSlots(
        (entity as { assignment?: unknown } | undefined)?.assignment,
    );
    const blueprintEntity = entity ?? fallbackEntity;
    const blueprintSlots = readSlots(
        resolveBlueprintById(runtime, blueprintEntity?.blueprintId)?.components
            ?.assignment,
    );
    const resolved = Math.max(
        liveSlots ?? 0,
        currentSlots ?? 0,
        blueprintSlots ?? 0,
    );
    return resolved > 0 ? resolved : Number.POSITIVE_INFINITY;
};
