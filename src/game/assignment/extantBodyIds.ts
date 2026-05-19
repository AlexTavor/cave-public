import type { RuntimeEntity } from "../../engine/runtime/types";

const readTags = (entity: RuntimeEntity): string[] =>
    Array.isArray(entity.tags) ? entity.tags : [];

export const isExtantBodyEntity = (entity: RuntimeEntity): boolean =>
    Boolean(entity.body) && !readTags(entity).includes("aggregate");

export const collectExtantBodyIds = (
    entities: ReadonlyArray<RuntimeEntity>,
): string[] =>
    entities
        .filter(isExtantBodyEntity)
        .map((entity) => entity.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

export const countExtantBodies = (
    entities: ReadonlyArray<RuntimeEntity>,
): number => collectExtantBodyIds(entities).length;
