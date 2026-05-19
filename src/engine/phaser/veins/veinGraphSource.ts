import type { PhysicsBody } from "../../physics/impulse/types";
import type { Runtime } from "../../runtime/Runtime";
import type { QueryCriteria } from "../../runtime/Snapshot";
import type { RuntimeEntity } from "../../runtime/types";

export interface VeinGraphSource {
    getEntities(): ReadonlyArray<Readonly<RuntimeEntity>>;
    getEntity(id: string): Readonly<RuntimeEntity> | undefined;
    getParentId?(entityId: string): string | undefined;
    getChildren?(parentId: string): ReadonlyArray<Readonly<RuntimeEntity>>;
    getPhysicsBody(id: string): Readonly<PhysicsBody> | undefined;
    query(criteria: QueryCriteria): ReadonlyArray<Readonly<RuntimeEntity>>;
}

export const createRuntimeVeinGraphSource = (
    runtime: Runtime,
): VeinGraphSource => ({
    getEntities: () => runtime.getEntities(),
    getEntity: (id) => runtime.getEntity(id),
    getParentId: (entityId) => {
        const parent = (
            runtime.getEntity(entityId) as { parent?: { parentId?: string } }
        )?.parent;
        if (typeof parent?.parentId !== "string") return undefined;
        return runtime.getEntity(parent.parentId)?.id ?? undefined;
    },
    getChildren: (parentId) =>
        runtime
            .getEntities()
            .filter(
                (entity) =>
                    (entity as { parent?: { parentId?: string } }).parent
                        ?.parentId === parentId,
            ),
    getPhysicsBody: (id) => runtime.getPhysicsBody(id),
    query: ({ tag }) =>
        runtime.getEntities().filter((entity) => {
            const tags = (entity as { tags?: string[] }).tags;
            return Array.isArray(tags) && tags.includes(tag);
        }),
});
