import type { RuntimeEntity } from "../../types";
import type { ParentComponent } from "../../../../data/schemas/components";

export const hasAuthoredParent = (blueprint: unknown): boolean =>
    Boolean(
        (blueprint as { components?: { parent?: unknown } }).components?.parent,
    );

export const hasConcreteParent = (entity: RuntimeEntity): boolean => {
    const parent = (entity as { parent?: unknown }).parent;
    return Boolean(
        parent && typeof parent === "object" && "parentId" in parent,
    );
};

export const matchesPeerParent = (
    parent: ParentComponent | undefined,
    blueprint: unknown,
): boolean => {
    if (!parent || "parentId" in parent) return false;
    if (parent.kind === "entity_id") {
        return (blueprint as { id?: unknown }).id === parent.entityId;
    }
    const tags = (blueprint as { tags?: unknown }).tags;
    return Array.isArray(tags) && tags.includes(parent.tag);
};
