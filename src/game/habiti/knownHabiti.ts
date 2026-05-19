import type { RuntimeEntity } from "../../engine/runtime/types";
import { isCarrierEntity, readCarrierCommands } from "../carriers/carrier";
import { normalizeHabitiIds } from "./habitiIds";

const readIds = (value: unknown) =>
    Array.isArray(value)
        ? value.filter((id): id is string => typeof id === "string")
        : [];

export const readOwnedHabiti = (entity: RuntimeEntity | undefined) =>
    normalizeHabitiIds(
        readIds(
            (entity as { cave?: { ownedHabiti?: unknown } })?.cave?.ownedHabiti,
        ),
    );

export const readPendingCarrierHabiti = (entities: RuntimeEntity[]) =>
    normalizeHabitiIds(
        entities.flatMap((entity) =>
            isCarrierEntity(entity)
                ? readCarrierCommands(entity).flatMap((action) =>
                      action.type === "GAIN_HABITI" ? [action.habitusId] : [],
                  )
                : [],
        ),
    );

export const readKnownHabiti = (
    entity: RuntimeEntity | undefined,
    entities: RuntimeEntity[] = [],
) =>
    normalizeHabitiIds([
        ...readOwnedHabiti(entity),
        ...readPendingCarrierHabiti(entities),
    ]);
