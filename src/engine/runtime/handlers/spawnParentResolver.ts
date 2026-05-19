import type { ParentComponent } from "../../../data/schemas/components";
import type { RuntimeEntity } from "../types";
import type { CommandHandlerContext } from "./types";

type ParentedEntity = RuntimeEntity & { parent?: ParentComponent };

const resolveTaggedParent = (
    tag: string,
    context: CommandHandlerContext,
): string | undefined =>
    context.world.entities.find((entity) => {
        const tags = (entity as { tags?: string[] }).tags;
        return Array.isArray(tags) && tags.includes(tag);
    })?.id;

const resolveAuthoredParent = (
    parent: ParentComponent,
    context: CommandHandlerContext,
): string | undefined => {
    if ("parentId" in parent) return parent.parentId;
    if (parent.kind === "entity_id") {
        return context.world.entities.find(
            (entity) => entity.id === parent.entityId,
        )?.id;
    }
    return resolveTaggedParent(parent.tag, context);
};

const describeParent = (parent: ParentComponent): string => {
    if ("parentId" in parent) return `id:${parent.parentId}`;
    return parent.kind === "entity_id"
        ? `id:${parent.entityId}`
        : `tag:${parent.tag}`;
};

export const applySpawnParent = (
    entity: ParentedEntity,
    blueprintId: string,
    context: CommandHandlerContext,
    overrideParentId?: string,
): void => {
    if (overrideParentId) {
        entity.parent = { parentId: overrideParentId };
        return;
    }
    if (!entity.parent) return;
    const parentId = resolveAuthoredParent(entity.parent, context);
    if (parentId) {
        entity.parent = { parentId };
        return;
    }
    console.warn(
        `[SpawnHandler] Parent target not found for '${blueprintId}' (${describeParent(entity.parent)}). Spawn continues without a parent.`,
    );
    delete entity.parent;
};
