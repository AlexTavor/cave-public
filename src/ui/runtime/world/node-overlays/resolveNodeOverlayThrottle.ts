import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";

const clampThrottle = (value: number) => Math.max(0, Math.min(1, value));

const readThrottle = (entity: RuntimeEntity | undefined): number | null => {
    const throttle = (entity as { powerSink?: { throttle?: unknown } })
        .powerSink?.throttle;
    return typeof throttle === "number" && Number.isFinite(throttle)
        ? clampThrottle(throttle)
        : null;
};

const resolveParentId = (entity: RuntimeEntity | undefined): string | null => {
    const parentId = (entity as { parent?: { parentId?: unknown } }).parent
        ?.parentId;
    return typeof parentId === "string" ? parentId : null;
};

export const resolveNodeOverlayThrottle = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
    entityById?: Map<string, RuntimeEntity>,
): number => {
    const byId =
        entityById ??
        (Array.isArray(runtime?.getEntities?.())
            ? new Map(
                  runtime.getEntities().map((entry) => [entry.id ?? "", entry]),
              )
            : null);
    if (!byId) return readThrottle(entity) ?? 0;
    const seen = new Set<string>();
    let current: RuntimeEntity | undefined = entity;
    while (current) {
        const throttle = readThrottle(current);
        if (throttle !== null) return throttle;
        const parentId = resolveParentId(current);
        if (!parentId || seen.has(parentId)) break;
        seen.add(parentId);
        current = byId.get(parentId);
    }
    return 0;
};
