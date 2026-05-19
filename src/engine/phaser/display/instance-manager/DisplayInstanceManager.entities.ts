import type { RuntimeEntity } from "../../../runtime/types";
import type { EntityVisualInstance } from "../visual-instance/EntityVisualInstance";
import type { DisplaySpec, DisplayStructuralRecord } from "../types";
import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import { publishNodeOverlayDisplayBounds } from "../node-overlay/nodeOverlayDisplayBoundsStore";
import { composeDisplaySpec } from "../resolve-display/resolveDisplaySpec";
import { tickInstanceSafe } from "./DisplayInstanceManagerTick";

type InstanceRecord = { spec: DisplaySpec; entity: RuntimeEntity };

export const tickDisplayManagerEntities = (input: {
    deps: DisplayInstanceManagerDeps;
    structuralRecords: Map<string, DisplayStructuralRecord>;
    instances: Map<string, EntityVisualInstance>;
    last: Map<string, InstanceRecord>;
    ensureInstance: (spec: DisplaySpec, entity: RuntimeEntity) => void;
    destroyInstance: (entityId: string) => void;
    timeMs: number;
    deltaMs: number;
}): void => {
    const runtime = input.deps.getRuntime();
    if (!runtime) return;
    for (const record of input.structuralRecords.values()) {
        const entity = runtime.getEntity(record.entityId);
        if (!entity) {
            input.structuralRecords.delete(record.entityId);
            input.destroyInstance(record.entityId);
            continue;
        }
        record.entity = entity;
        if (input.deps.shouldRenderEntity?.(entity) === false) {
            input.destroyInstance(record.entityId);
            continue;
        }
        const body = runtime.getPhysicsBody(record.entityId) ?? null;
        const spec = composeDisplaySpec(
            record.staticSpec,
            entity,
            body ? { x: body.x, y: body.y, radius: body.radius } : null,
        );
        input.ensureInstance(spec, entity);
        const instance = input.instances.get(spec.entityId);
        if (!instance) continue;
        tickInstanceSafe(
            instance,
            input.deps,
            spec,
            entity,
            input.timeMs,
            input.deltaMs,
        );
        const bounds = instance.readNodeOverlayDisplayBounds();
        if (bounds) publishNodeOverlayDisplayBounds(bounds);
        input.last.set(spec.entityId, { spec, entity });
    }
};
