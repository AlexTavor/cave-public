import type { ImpulseConfig } from "../../../data/schemas/physics";
import { computeAnchorForce } from "./ImpulseAnchor";
import { computeSeek } from "./Steering";
import type { ImpulseForceField } from "./ImpulseForceField";
import type { PhysicsBody, Vector2 } from "./types";

const zeroVector: Vector2 = { x: 0, y: 0 };

export const computeTargetForce = (params: {
    body: PhysicsBody;
    bodies: Map<string, PhysicsBody>;
    config: ImpulseConfig;
}): Vector2 => {
    const { body, bodies, config } = params;
    if (!body.targetId) return zeroVector;
    const target = bodies.get(body.targetId);
    if (!target) return zeroVector;
    return computeSeek(body, target.position, config);
};

export const computeAnchorContribution = (params: {
    body: PhysicsBody;
    bodies: Map<string, PhysicsBody>;
}): Vector2 => {
    const { body, bodies } = params;
    if (!body.anchor) return zeroVector;
    const targetBody =
        body.anchor.type === "entity"
            ? bodies.get(body.anchor.entityId)
            : undefined;
    return computeAnchorForce(body, body.anchor, targetBody);
};

export const computeExternalForces = (params: {
    body: PhysicsBody;
    config: ImpulseConfig;
    externalFields: ImpulseForceField[];
}): Vector2 => {
    const { body, config, externalFields } = params;
    let externalX = 0;
    let externalY = 0;

    for (const field of externalFields) {
        const external = field(body, config);
        externalX += external.x;
        externalY += external.y;
    }

    return { x: externalX, y: externalY };
};
