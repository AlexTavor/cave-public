import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";
import { getHeading } from "./ImpulseSteeringMath";

const EPSILON = 1e-6;

const isNearZero = (value: number): boolean =>
    !Number.isFinite(value) || Math.abs(value) < EPSILON;

const normalize = (x: number, y: number): Vector2 => {
    const len = Math.hypot(x, y);
    if (!Number.isFinite(len) || len < EPSILON) {
        return { x: 0, y: 0 };
    }

    return { x: x / len, y: y / len };
};

const buildFeeler = (
    body: PhysicsBody,
    heading: Vector2,
    config: ImpulseConfig,
): { startX: number; startY: number; endX: number; endY: number } => {
    const hasHeading = !isNearZero(heading.x) || !isNearZero(heading.y);
    const projectionHeadingX = hasHeading ? heading.x : 1;
    const projectionHeadingY = hasHeading ? heading.y : 0;
    const startX = body.position.x;
    const startY = body.position.y;
    const endX = startX + projectionHeadingX * config.lookAheadDistance;
    const endY = startY + projectionHeadingY * config.lookAheadDistance;
    return { startX, startY, endX, endY };
};

const lineCircleIntersectionT = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    centerX: number,
    centerY: number,
    radius: number,
): number | null => {
    const dx = endX - startX;
    const dy = endY - startY;
    const a = dx * dx + dy * dy;
    if (!Number.isFinite(a) || a < EPSILON) {
        return null;
    }

    const fx = startX - centerX;
    const fy = startY - centerY;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - radius * radius;

    if (c <= 0) {
        return 0;
    }

    const discriminant = b * b - 4 * a * c;
    if (!Number.isFinite(discriminant) || discriminant < 0) {
        return null;
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const denom = 2 * a;
    const t1 = (-b - sqrtDisc) / denom;
    const t2 = (-b + sqrtDisc) / denom;

    let t = Infinity;
    if (t1 >= 0 && t1 <= 1) t = t1;
    if (t2 >= 0 && t2 <= 1) t = Math.min(t, t2);

    return Number.isFinite(t) ? t : null;
};

const findClosestObstacle = (
    bodyId: string,
    neighbors: PhysicsBody[],
    feeler: { startX: number; startY: number; endX: number; endY: number },
    targetId?: string,
): PhysicsBody | null => {
    let closestObstacle: PhysicsBody | null = null;
    let closestT = Infinity;

    for (const neighbor of neighbors) {
        if (neighbor.id === bodyId) continue;
        // [!code focus]
        if (targetId && neighbor.id === targetId) continue;
        if (!neighbor.isStatic) continue;

        const t = lineCircleIntersectionT(
            feeler.startX,
            feeler.startY,
            feeler.endX,
            feeler.endY,
            neighbor.position.x,
            neighbor.position.y,
            neighbor.radius,
        );

        if (t === null) continue;
        if (t < closestT) {
            closestT = t;
            closestObstacle = neighbor;
        }
    }

    return closestObstacle;
};

const resolveAwayVector = (
    body: PhysicsBody,
    obstacle: PhysicsBody,
    feelerEndX: number,
    feelerEndY: number,
): Vector2 => {
    const dx = body.position.x - obstacle.position.x;
    const dy = body.position.y - obstacle.position.y;
    const distance = Math.hypot(dx, dy);
    const overlapThreshold = body.radius + obstacle.radius;
    const pushbackThreshold = overlapThreshold * 1.25;

    if (Number.isFinite(distance) && distance <= pushbackThreshold) {
        return { x: dx, y: dy };
    }

    return {
        x: feelerEndX - obstacle.position.x,
        y: feelerEndY - obstacle.position.y,
    };
};

const applyTieBreak = (
    heading: Vector2,
    hasHeading: boolean,
    forceScale: number,
    config: ImpulseConfig,
): Vector2 => {
    if (hasHeading) {
        const perpRight = normalize(heading.y, -heading.x);
        return {
            x: perpRight.x * config.avoidanceForce * forceScale,
            y: perpRight.y * config.avoidanceForce * forceScale,
        };
    }

    return {
        x: config.avoidanceForce * forceScale,
        y: 0,
    };
};

export const computeObstacleAvoidance = (
    body: PhysicsBody,
    neighbors: PhysicsBody[],
    config: ImpulseConfig,
    targetId?: string,
): Vector2 => {
    if (body.isStatic) return { x: 0, y: 0 };
    if (config.avoidanceForce <= 0 || config.lookAheadDistance <= 0) {
        return { x: 0, y: 0 };
    }

    const heading = getHeading(body);
    const hasHeading = !isNearZero(heading.x) || !isNearZero(heading.y);
    const forceScale = Math.max(1, config.lookAheadDistance * 1.5);
    const feeler = buildFeeler(body, heading, config);

    // [!code focus]
    const closestObstacle = findClosestObstacle(
        body.id,
        neighbors,
        feeler,
        targetId,
    );
    if (!closestObstacle) return { x: 0, y: 0 };

    const away = resolveAwayVector(
        body,
        closestObstacle,
        feeler.endX,
        feeler.endY,
    );
    const awayDir = normalize(away.x, away.y);
    const force = {
        x: awayDir.x * config.avoidanceForce * forceScale,
        y: awayDir.y * config.avoidanceForce * forceScale,
    };

    const needsTieBreak =
        (isNearZero(awayDir.x) && isNearZero(awayDir.y)) ||
        !hasHeading ||
        (isNearZero(force.x) && isNearZero(force.y));

    return needsTieBreak
        ? applyTieBreak(heading, hasHeading, forceScale, config)
        : force;
};
