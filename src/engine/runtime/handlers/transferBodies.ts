import type { RuntimeEntity } from "../types";
import type { PhysicsBody } from "../../physics/impulse/types";
import { stringHash } from "../../../utils/deterministicHash";
export interface PendingBodyOptions {
    mass: number;
    radius: number;
    drag: number;
    impulseMagnitude: number;
}

const buildImpulseVelocity = (
    magnitude: number,
    direction?: { x: number; y: number },
): { x: number; y: number } => {
    const velocityMagnitude = magnitude * 60;
    const speed = velocityMagnitude * (0.6 + Math.random() * 0.4);

    if (direction) {
        const baseAngle = Math.atan2(direction.y, direction.x);
        const spread = (Math.random() - 0.5) * (Math.PI / 12);
        const angle = baseAngle + spread;
        return {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
        };
    }

    const angle = Math.random() * Math.PI * 2;
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
            ? buildImpulseVelocity(options.impulseMagnitude, direction)
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
