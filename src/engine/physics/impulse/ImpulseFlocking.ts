import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";
import { getVelocityProxy } from "./ImpulseSteeringMath";
import { computeSeek } from "./Steering";

export const computeAlignment = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig,
): Vector2 => {
    if (config.alignmentWeight <= 0 || config.flockingRadius <= 0) {
        return { x: 0, y: 0 };
    }

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const neighbor of neighbors) {
        if (neighbor.id === body.id) continue;
        if (neighbor.isStatic) continue;

        const dx = body.position.x - neighbor.position.x;
        const dy = body.position.y - neighbor.position.y;
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance > config.flockingRadius) {
            continue;
        }

        const velocity = getVelocityProxy(neighbor);
        sumX += velocity.x;
        sumY += velocity.y;
        count += 1;
    }

    if (count <= 0) {
        return { x: 0, y: 0 };
    }

    const avgX = sumX / count;
    const avgY = sumY / count;
    const selfVelocity = getVelocityProxy(body);

    return {
        x: (avgX - selfVelocity.x) * config.alignmentWeight,
        y: (avgY - selfVelocity.y) * config.alignmentWeight,
    };
};

export const computeCohesion = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig,
): Vector2 => {
    if (config.cohesionWeight <= 0 || config.flockingRadius <= 0) {
        return { x: 0, y: 0 };
    }

    let centerX = 0;
    let centerY = 0;
    let count = 0;

    for (const neighbor of neighbors) {
        if (neighbor.id === body.id) continue;
        if (neighbor.isStatic) continue;

        const dx = body.position.x - neighbor.position.x;
        const dy = body.position.y - neighbor.position.y;
        const distance = Math.hypot(dx, dy);
        if (!Number.isFinite(distance) || distance > config.flockingRadius) {
            continue;
        }

        centerX += neighbor.position.x;
        centerY += neighbor.position.y;
        count += 1;
    }

    if (count <= 0) {
        return { x: 0, y: 0 };
    }

    const center = {
        x: centerX / count,
        y: centerY / count,
    };

    const seek = computeSeek(body, center, config);
    return {
        x: seek.x * config.cohesionWeight,
        y: seek.y * config.cohesionWeight,
    };
};
