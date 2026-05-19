import type { RuntimeEntity } from "../../engine/runtime/types";

export type BodyAssignmentStatus = "navigating" | "orbiting";

const DEFAULT_OWNER_ID = "sys_world";
const DEFAULT_STATUS: BodyAssignmentStatus = "orbiting";
export const ORBIT_PHASE_OFFSET_KEY = "assignment_orbit_phase_offset";
export const ORBIT_RADIUS_OFFSET_KEY = "assignment_orbit_radius_offset";
export const REQUIRED_MS_KEY = "assignment_required_ms";

export const isBodyEntity = (entity: RuntimeEntity | undefined): boolean =>
    Boolean((entity as { body?: unknown } | undefined)?.body);

export const readAssignedIds = (
    entity: RuntimeEntity | undefined,
): string[] => {
    const assignedIds = (entity as { assignment?: { assignedIds?: string[] } })
        ?.assignment?.assignedIds;
    return Array.isArray(assignedIds) ? assignedIds : [];
};

export const readAssignmentId = (entity: RuntimeEntity | undefined): string => {
    const id = (entity as { body?: { assignmentId?: unknown } })?.body
        ?.assignmentId;
    return typeof id === "string" && id ? id : DEFAULT_OWNER_ID;
};

export const readAssignmentStatus = (
    entity: RuntimeEntity | undefined,
): BodyAssignmentStatus => {
    const status = (entity as { body?: { assignmentStatus?: unknown } })?.body
        ?.assignmentStatus;
    return status === "navigating" ? status : DEFAULT_STATUS;
};

export const ensureAssignmentComponent = (
    entity: RuntimeEntity,
): { assignedIds: string[] } => {
    const assignment = ((
        entity as { assignment?: { assignedIds?: string[] } }
    ).assignment ??= { assignedIds: [] });
    assignment.assignedIds = readAssignedIds(entity);
    return assignment as { assignedIds: string[] };
};

export const resetBodyAssignmentProgress = (entity: RuntimeEntity): void => {
    const state = ((entity as { state?: Record<string, any> }).state ??= {});
    state.assignment_progress_ms = { value: 0, visible: false };
    state.assignment_progress_ratio = { value: 0, visible: false };
    state[REQUIRED_MS_KEY] = { value: 0, visible: false };
    delete state[ORBIT_PHASE_OFFSET_KEY];
    delete state[ORBIT_RADIUS_OFFSET_KEY];
};

export const readAssignmentRequiredMs = (
    entity: RuntimeEntity | undefined,
): number => readStateNumber(entity, REQUIRED_MS_KEY);

export const readAssignmentDuration = (
    entity: RuntimeEntity | undefined,
): number => {
    const duration = readStateNumber(entity, "assignment_duration");
    return duration > 0
        ? duration
        : readStateNumber(entity, "absorption_duration");
};

export const setAssignmentRequiredMs = (
    entity: RuntimeEntity,
    requiredMs: number,
): void => {
    const state = ((entity as { state?: Record<string, any> }).state ??= {});
    state[REQUIRED_MS_KEY] = { value: Math.max(0, requiredMs), visible: false };
};

export const readBodyOrbitOffsets = (
    entity: RuntimeEntity | undefined,
): { phaseOffset: number; radiusOffset: number } | null => {
    const phaseOffset = (
        entity as { state?: Record<string, { value?: unknown }> }
    )?.state?.[ORBIT_PHASE_OFFSET_KEY]?.value;
    const radiusOffset = (
        entity as { state?: Record<string, { value?: unknown }> }
    )?.state?.[ORBIT_RADIUS_OFFSET_KEY]?.value;
    return typeof phaseOffset === "number" && typeof radiusOffset === "number"
        ? { phaseOffset, radiusOffset }
        : null;
};

export const readStateNumber = (
    entity: RuntimeEntity | undefined,
    key: string,
): number => {
    const value = (entity as { state?: Record<string, { value?: unknown }> })
        ?.state?.[key]?.value;
    return typeof value === "number" ? value : 0;
};

export const setBodyAssignment = (
    entity: RuntimeEntity,
    ownerId: string,
    status: BodyAssignmentStatus,
): void => {
    const body = (entity as { body?: Record<string, unknown> }).body;
    if (!body) return;
    body.assignmentId = ownerId;
    body.assignmentStatus = status;
};

export const removeBodyFromOwners = (
    entities: RuntimeEntity[],
    bodyId: string,
): void => {
    entities.forEach((entity) => {
        const assignedIds = readAssignedIds(entity);
        if (!assignedIds.includes(bodyId)) return;
        ensureAssignmentComponent(entity).assignedIds = assignedIds.filter(
            (id) => id !== bodyId,
        );
    });
};
