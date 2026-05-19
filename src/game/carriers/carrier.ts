import type { BehaviorAction } from "../../data/schemas/behavior";
import type { RuntimeEntity } from "../../engine/runtime/types";

export const CARRIER_ARRIVED_STATE_KEY = "carrier_arrived";

export const isCarrierEntity = (
    entity: RuntimeEntity | undefined,
): entity is RuntimeEntity & { carrier: { commands: BehaviorAction[] } } =>
    Array.isArray(
        (entity as { carrier?: { commands?: unknown } })?.carrier?.commands,
    );

export const readCarrierCommands = (entity: RuntimeEntity | undefined) =>
    isCarrierEntity(entity) ? entity.carrier.commands : [];

export const hasCarrierArrived = (entity: RuntimeEntity | undefined): boolean =>
    (entity as { state?: Record<string, { value?: unknown }> })?.state?.[
        CARRIER_ARRIVED_STATE_KEY
    ]?.value === 1;
