import type { RuntimeEntity } from "../types";

export const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export {
    buildPendingBody,
    resolvePhysicsPosition,
    type PendingBodyOptions,
} from "./transferBodies";

export { buildPayloadLabel, resolveTransferVisualType } from "./transferRender";

export { debitResources, hasSufficientResources } from "./transferResources";

