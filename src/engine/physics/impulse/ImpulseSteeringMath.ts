import type { PhysicsBody, Vector2 } from "./types";

const EPSILON = 1e-6;

export const getVelocityProxy = (body: PhysicsBody): Vector2 => {
    const vx = body.position.x - body.prevPosition.x;
    const vy = body.position.y - body.prevPosition.y;
    const len = Math.hypot(vx, vy);

    if (!Number.isFinite(len) || len < EPSILON) {
        return { x: 0, y: 0 };
    }

    return { x: vx, y: vy };
};

export const getHeading = (body: PhysicsBody): Vector2 => {
    const vx = body.position.x - body.prevPosition.x;
    const vy = body.position.y - body.prevPosition.y;
    const len = Math.hypot(vx, vy);

    if (!Number.isFinite(len) || len < EPSILON) {
        return { x: 0, y: 0 };
    }

    return { x: vx / len, y: vy / len };
};
