import type { RuntimeEntity } from "../../engine/runtime/types";

const readStateValue = (entity: RuntimeEntity, key: string) =>
    (entity as { state?: Record<string, { value?: unknown }> }).state?.[key]
        ?.value;

export const doesProcessingDestroyBodies = (station: RuntimeEntity): boolean =>
    readStateValue(station, "processing_destroys_assigned_bodies") === true;

export const isEntityDepleted = (entity: RuntimeEntity): boolean =>
    readStateValue(entity, "is_depleted") === 1;
