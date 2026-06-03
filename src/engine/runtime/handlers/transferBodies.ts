import type { RuntimeEntity } from "../types";
import type { PhysicsBody } from "../../physics/impulse/types";
import { stringHash } from "../../../utils/deterministicHash";
import { pseudoRandom } from "../../../utils/pseudoRandom";
export interface PendingBodyOptions {
    mass: number;
    radius: number;
    drag: number;
    impulseMagnitude: number;
}

// Velocity jitter is seeded deterministically from the body id (matching the
// `body.seed = stringHash(id)` below) so the headless balancing runner replays
// identically. Distinct sub-seeds keep speed/spread/angle independent.
const buildImpulseVelocity = (
    id: string,
    magnitude: number,
    direction?: { x: number; y: number },
): { x: number; y: number } => {
    const velocityMagnitude = magnitude * 60;
    const speed = velocityMagnitude * (0.6 + pseudoRandom(`${id}:speed`) * 0.4);

    if (direction) {
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = (pseudoRandom(`${id}:spread`) - 0.5) * (Math.PI / 12);
        const angle = baseAngle + spread;
        return {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
        };
    }

    const angle = pseudoRandom(`${id}:angle`) * Math.PI * 2;
    return {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
    };
};

export const resolvePhysicsPosition = (
    entity: RuntimeEntity,
): { x: number; y: number } | null => {
    const physics = (entity as any).physics;
    if (!physics || typeof physics !== "object") return null;

    const x = physics.x;
    const y = physics.y;

    if (
        typeof x === "number" &&
        typeof y === "number" &&
        Number.isFinite(x) &&
        Number.isFinite(y)
    ) {
        return { x, y };
    }

    return null;
};

export const buildPendingBody = (
    id: string,
    position: { x: number; y: number },
    options: PendingBodyOptions,
    direction?: { x: number; y: number },
    targetId?: string,
): PhysicsBody => {
    const velocity =
        options.impulseMagnitude > 0
            ? buildImpulseVelocity(id, options.impulseMagnitude, direction)
            : null;

    const body: PhysicsBody = {
        id,
        entity: id,
        x: position.x,
        y: position.y,
        mass: options.mass,
        radius: options.radius,
        drag: options.drag,
        position: { ...position },
        prevPosition: { ...position },
        acceleration: { x: 0, y: 0 },
        isStatic: false,
        layer: "phantom",
        seed: stringHash(id),
        targetId,
    };

    if (velocity) {
        body.velocity = { x: velocity.x, y: velocity.y };
    }

    return body;
};
