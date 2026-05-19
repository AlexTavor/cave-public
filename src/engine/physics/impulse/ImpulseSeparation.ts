import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";
import type { Quadtree } from "../quadtree/Quadtree";

const resolveSeparationRadius = (
    body: PhysicsBody,
    config: ImpulseConfig,
): number =>
    Math.max(
        body.radius * config.separationRadiusMultiplier,
        config.defaultQueryRadius,
    );

export const computeSeparation = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig,
    targetId?: string,
): Vector2 => {
    if (config.separationStrength <= 0) return { x: 0, y: 0 };

    const searchRadius = resolveSeparationRadius(body, config);
    let totalX = 0;
    let totalY = 0;

    for (const neighbor of neighbors) {
        if (neighbor.id === body.id) continue;
        if (targetId && neighbor.id === targetId) continue;

        let dx = body.position.x - neighbor.position.x;
        let dy = body.position.y - neighbor.position.y;
        let distance = Math.hypot(dx, dy);

        // If bodies are exactly on top of each other, nudge them slightly apart
        if (distance < 0.0001) {
            dx += 1;
            distance = 1;
        }

        if (!Number.isFinite(distance)) continue;
        if (distance > searchRadius) continue;

        const minDistance = body.radius + neighbor.radius;
        const overlap = Math.max(0, minDistance - distance);
        const strength =
            (config.separationStrength * (overlap + 1)) /
            (distance * Math.max(body.mass, 0.1));

        totalX += (dx / distance) * strength;
        totalY += (dy / distance) * strength;
    }

    return { x: totalX, y: totalY };
};

export const applySeparation = (
    body: PhysicsBody,
    quadtree: Quadtree,
    config: ImpulseConfig,
    queryBuffer: PhysicsBody[],
): void => {
    if (config.separationStrength <= 0) return;

    const searchRadius = resolveSeparationRadius(body, config);

    queryBuffer.length = 0;
    quadtree.queryRadius(body.x, body.y, searchRadius, queryBuffer);

    const force = computeSeparation(body, queryBuffer, config, body.targetId);
    body.acceleration.x += force.x;
    body.acceleration.y += force.y;
};
