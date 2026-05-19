import type { Snapshot } from "../../engine/runtime/Snapshot";
import { hasCarrierArrived, isCarrierEntity } from "./carrier";

export const evaluateCarriersOrbiting = (snapshot: Snapshot): boolean =>
    snapshot
        .getEntities()
        .some(
            (entity) =>
                isCarrierEntity(entity as any) &&
                hasCarrierArrived(entity as any),
        );
