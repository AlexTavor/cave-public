import type { RuntimeEntity } from "../../engine/runtime/types";
import { readAssignmentDuration } from "./bodyAssignment";

export { readAssignmentDuration } from "./bodyAssignment";

const readStateValue = (entity: RuntimeEntity, key: string): unknown =>
    (entity as { state?: Record<string, { value?: unknown }> }).state?.[key]
        ?.value;

const isAssignmentCarrier = (entity: RuntimeEntity | undefined): boolean =>
    Boolean((entity as { assignment?: unknown } | undefined)?.assignment);

const isProcessingCandidate = (entity: RuntimeEntity): boolean =>
    readAssignmentDuration(entity) > 0 ||
    Array.isArray(readStateValue(entity, "processing_outputs")) ||
    readStateValue(entity, "processing_destroys_assigned_bodies") === true;

const isPowerCandidate = (entity: RuntimeEntity): boolean =>
    Boolean((entity as { powerSink?: unknown }).powerSink);

export const isProcessingAssignmentNode = (
    entity: RuntimeEntity | undefined,
): boolean => {
    if (!entity || entity.id === "sys_world" || entity.id === "sys_pointer")
        return false;
    return isAssignmentCarrier(entity) && isProcessingCandidate(entity);
};

export const isPowerAssignmentNode = (
    entity: RuntimeEntity | undefined,
): boolean => {
    if (!entity) return false;
    if (entity.id === "sys_world" || entity.id === "sys_pointer") return false;
    return isAssignmentCarrier(entity) && isPowerCandidate(entity);
};

export const isAssignableTargetNode = (
    entity: RuntimeEntity | undefined,
): boolean => {
    if (!entity) return false;
    if (!isPowerCandidate(entity) && !isProcessingCandidate(entity)) {
        return false;
    }
    return (
        (entity as { state?: { is_depleted?: { value?: unknown } } }).state
            ?.is_depleted?.value !== 1
    );
};

export const resolveAssignmentOwnerKind = (
    entity: RuntimeEntity | undefined,
): "world" | "pointer" | "power" | "processing" | "other" => {
    if (entity?.id === "sys_world") return "world";
    if (entity?.id === "sys_pointer") return "pointer";
    if (entity && isProcessingCandidate(entity)) return "processing";
    if (entity && isPowerCandidate(entity)) return "power";
    return "other";
};
