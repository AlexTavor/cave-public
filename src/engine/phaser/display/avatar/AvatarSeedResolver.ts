import type { Runtime } from "../../../runtime/Runtime";
import type { RuntimeEntity } from "../../../runtime/types";
import { resolvePassportAvatarDisplayKey } from "../../../../lib/body-identity/avatarDisplayKey";

const readPassportKey = (entity: RuntimeEntity | null | undefined) =>
    resolvePassportAvatarDisplayKey(
        (entity as { body?: { passport?: unknown } } | null | undefined)?.body
            ?.passport as any,
    );

const readNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    return value.trim() ? value : null;
};

const resolveAssignedBodyId = (entity: RuntimeEntity): string | null => {
    const stateId = readNonEmptyString(
        (entity.state as Record<string, { value?: unknown }> | undefined)
            ?.assignedEntityId?.value,
    );
    if (stateId) return stateId;
    const assignedIds = (
        entity.assignment as { assignedIds?: unknown } | undefined
    )?.assignedIds;
    if (!Array.isArray(assignedIds)) return null;
    return readNonEmptyString(assignedIds[0]);
};

export const resolveAvatarSubjectSeed = (
    entity: RuntimeEntity,
    runtime: Runtime | null = null,
): string | null => {
    const assignedId = resolveAssignedBodyId(entity);
    const assignedEntity = assignedId ? runtime?.getEntity(assignedId) : null;
    const assignedKey = readPassportKey(assignedEntity);
    if (assignedKey) return assignedKey;
    if (assignedId) return assignedId;

    const ownKey = readPassportKey(entity);
    if (ownKey) return ownKey;

    return readNonEmptyString(entity.id);
};
