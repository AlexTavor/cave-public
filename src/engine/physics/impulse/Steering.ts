import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";
const MIN_DISTANCE = 0.0001;
const ARRIVAL_EPSILON = 0.5;

export const computeSeek = (
    body: PhysicsBody,
    target: Vector2,
    config: ImpulseConfig,
): Vector2 => {
    if (body.isStatic) return { x: 0, y: 0 };

    const dx = target.x - body.position.x;
    const dy = target.y - body.position.y;
    const len = Math.hypot(dx, dy);

    if (!Number.isFinite(len) || len <= MIN_DISTANCE) {
        return { x: 0, y: 0 };
    }

    const dirX = dx / len;
    const dirY = dy / len;
    const mass = Number.isFinite(body.mass) && body.mass > 0 ? body.mass : 1;
    const strength =
        Number.isFinite(config.seekStrength) && config.seekStrength > 0
            ? config.seekStrength
            : 0;

    return {
        x: (dirX * strength) / mass,
        y: (dirY * strength) / mass,
    };
};

export const applySeek = (
    body: PhysicsBody,
    target: Vector2,
    config: ImpulseConfig,
): void => {
    const force = computeSeek(body, target, config);
    body.acceleration.x += force.x;
    body.acceleration.y += force.y;
};

export const hasArrived = (body: PhysicsBody, target: PhysicsBody): boolean => {
    const dx = body.position.x - target.position.x;
    const dy = body.position.y - target.position.y;
    const distance = Math.hypot(dx, dy);
    const threshold = body.radius + target.radius + ARRIVAL_EPSILON;

    if (!Number.isFinite(distance) || !Number.isFinite(threshold)) {
        return false;
    }

    return distance <= threshold;
};
