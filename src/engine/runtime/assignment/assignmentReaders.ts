import type { RuntimeEntity } from "../types";

// Pure structural readers over the engine-native body/assignment components
// (the same components UpdateAssignmentHandler and the spawn path manage). The
// engine (phaser input) and game both read them, so they live in engine; the
// game's bodyAssignment re-exports them for its many callers.

const DEFAULT_OWNER_ID = "sys_world";

export const isBodyEntity = (entity: RuntimeEntity | undefined): boolean =>
    Boolean((entity as { body?: unknown } | undefined)?.body);

export const readAssignmentId = (entity: RuntimeEntity | undefined): string => {
    const id = (entity as { body?: { assignmentId?: unknown } })?.body
        ?.assignmentId;
    return typeof id === "string" && id ? id : DEFAULT_OWNER_ID;
};
