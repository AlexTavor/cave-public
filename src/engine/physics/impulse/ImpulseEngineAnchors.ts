import { hasArrived } from "./Steering";
import type { ArrivalEvent, PhysicsBody } from "./types";
import { isHardAnchored } from "./ImpulseEngineUtils";

export const resolveHardAnchors = (bodies: Map<string, PhysicsBody>): void => {
    for (const body of bodies.values()) {
        if (!isHardAnchored(body)) continue;

        const anchor = body.anchor;
        if (anchor?.type !== "entity") continue;

        const target = bodies.get(anchor.entityId);
        if (!target) continue;

        const offsetX = anchor.offsetX ?? 0;
        const offsetY = anchor.offsetY ?? 0;

        const nextX = target.position.x + offsetX;
        const nextY = target.position.y + offsetY;

        body.position.x = nextX;
        body.position.y = nextY;
        body.prevPosition.x = nextX;
        body.prevPosition.y = nextY;
        body.acceleration.x = 0;
        body.acceleration.y = 0;
        body.x = nextX;
        body.y = nextY;
    }
};

export const collectArrivals = (
    bodies: Map<string, PhysicsBody>,
): ArrivalEvent[] => {
    const arrivals: ArrivalEvent[] = [];

    for (const body of bodies.values()) {
        if (!body.targetId) continue;
        const target = bodies.get(body.targetId);
        if (!target) continue;
        if (hasArrived(body, target)) {
            arrivals.push({ bodyId: body.id, targetId: target.id });
        }
    }

    return arrivals;
};
