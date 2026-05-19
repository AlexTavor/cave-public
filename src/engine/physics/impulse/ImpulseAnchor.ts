import type { AnchorConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";

const zeroVector: Vector2 = { x: 0, y: 0 };

const normalize = (x: number, y: number): Vector2 => {
    const magnitude = Math.hypot(x, y);
    if (magnitude <= 0) return zeroVector;
    return { x: x / magnitude, y: y / magnitude };
};

export const computeAnchorForce = (
    body: PhysicsBody,
    anchor: AnchorConfig,
    targetBody?: PhysicsBody,
): Vector2 => {
    if (anchor.type === "coordinate") {
        const dx = anchor.x - body.position.x;
        const dy = anchor.y - body.position.y;
        return {
            x: dx * anchor.stiffness,
            y: dy * anchor.stiffness,
        };
    }

    if (!targetBody) return zeroVector;

    const dx = targetBody.position.x - body.position.x;
    const dy = targetBody.position.y - body.position.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0) return zeroVector;

    const displacement = distance - anchor.distance;
    const direction = normalize(dx, dy);

    return {
        x: direction.x * displacement * anchor.stiffness,
        y: direction.y * displacement * anchor.stiffness,
    };
};
