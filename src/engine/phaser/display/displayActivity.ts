import type { RuntimeEntity } from "../../runtime/types";
import type { Runtime } from "../../runtime/Runtime";
import { readCycleProgress } from "./modules/cycle-progress/cycleProgressReader";

const readStateValue = (entity: RuntimeEntity, key: string) =>
    (entity as { state?: Record<string, { value?: unknown }> }).state?.[key]
        ?.value;

const isFalsyCycleFlag = (value: unknown) => value === 0 || value === false;
const readPositive = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : 0;

const readAllocatedDraw = (entity: RuntimeEntity) => {
    const draw = (
        entity.powerSink as
            | { allocatedDraw?: Record<string, unknown> }
            | undefined
    )?.allocatedDraw;
    return (
        readPositive(draw?.body) +
        readPositive(draw?.mind) +
        readPositive(draw?.social)
    );
};

const isStorageEntity = (entity: RuntimeEntity) => {
    if (entity.tags?.some((tag) => tag.startsWith("storage:"))) return true;
    return Object.values(entity.state ?? {}).some(
        (entry) =>
            Boolean(entry) &&
            typeof entry === "object" &&
            ("allowDeposit" in entry || "allowWithdraw" in entry),
    );
};

const isTransferEntity = (entity: RuntimeEntity) =>
    entity.tags?.includes("pending_transfer") ||
    Boolean((entity as { transfer?: unknown }).transfer);

const collectChildrenByParent = (entities: ReadonlyArray<RuntimeEntity>) => {
    const children = new Map<string, RuntimeEntity[]>();
    for (const entity of entities) {
        const parentId = (entity.parent as { parentId?: string } | undefined)
            ?.parentId;
        if (!parentId) continue;
        children.set(parentId, [...(children.get(parentId) ?? []), entity]);
    }
    return children;
};

const readDescendantDraw = (
    rootId: string,
    childrenByParent: Map<string, RuntimeEntity[]>,
) => {
    const visited = new Set([rootId]);
    const stack = [...(childrenByParent.get(rootId) ?? [])];
    let total = 0;
    while (stack.length) {
        const child = stack.pop()!;
        if (!child.id) continue;
        if (visited.has(child.id)) {
            console.error(
                `[displayActivity] Cycle detected while resolving descendant draw for '${rootId}' at '${child.id}'.`,
            );
            continue;
        }
        visited.add(child.id);
        total += readAllocatedDraw(child);
        stack.push(...(childrenByParent.get(child.id) ?? []));
    }
    return total;
};

export const isDisplayActive = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): boolean => {
    if (readCycleProgress(entity as Record<string, unknown>).kind !== "valid") {
        if (isStorageEntity(entity)) return true;
        if (isTransferEntity(entity)) return true;
        if (!runtime || !entity.id) return readAllocatedDraw(entity) > 0;
        const childrenByParent = collectChildrenByParent(runtime.getEntities());
        if (childrenByParent.has(entity.id)) {
            return readDescendantDraw(entity.id, childrenByParent) > 0;
        }
        return readAllocatedDraw(entity) > 0;
    }
    const powerSink = entity.powerSink as { status?: string } | undefined;
    if ((powerSink?.status ?? "nominal") === "blackout") return false;
    if (readStateValue(entity, "is_depleted") === 1) return false;
    return !isFalsyCycleFlag(readStateValue(entity, "cycle_active"));
};
