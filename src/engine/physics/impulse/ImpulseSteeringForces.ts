import type { ImpulseConfig } from "../../../data/schemas/physics";
import { computeAlignment, computeCohesion } from "./ImpulseFlocking";
import { computeObstacleAvoidance } from "./ImpulseObstacleAvoidance";
import { computeSeparation } from "./ImpulseSeparation";
import type { SpatialIndex } from "./ImpulseSpatialIndex";
import type { PhysicsBody, Vector2 } from "./types";
import { stringHash } from "../../../utils/deterministicHash";

export interface SpatialForces {
    avoidanceX: number;
    avoidanceY: number;
    otherX: number;
    otherY: number;
}

const zeroVector: Vector2 = { x: 0, y: 0 };

export const computeSpatialForces = (params: {
    body: PhysicsBody;
    spatialIndex: SpatialIndex | null;
    config: ImpulseConfig;
    queryBuffer: PhysicsBody[];
}): SpatialForces => {
    const { body, spatialIndex, config, queryBuffer } = params;
    let avoidanceX = 0;
    let avoidanceY = 0;
    let otherX = 0;
    let otherY = 0;

    if (!spatialIndex) {
        return { avoidanceX, avoidanceY, otherX, otherY };
    }

    const queryRadius = Math.max(
        config.flockingRadius,
        config.lookAheadDistance,
        config.defaultQueryRadius,
        body.radius * config.separationRadiusMultiplier,
    );

    queryBuffer.length = 0;
    spatialIndex.tree.queryRadius(body.x, body.y, queryRadius, queryBuffer);

    const avoidance = computeObstacleAvoidance(
        body,
        queryBuffer,
        config,
        body.targetId,
    );
    avoidanceX += avoidance.x;
    avoidanceY += avoidance.y;

    const separation = computeSeparation(
        body,
        queryBuffer,
        config,
        body.targetId,
    );
    otherX += separation.x;
    otherY += separation.y;

    const alignment = computeAlignment(body, queryBuffer, config);
    otherX += alignment.x;
    otherY += alignment.y;

    const cohesion = computeCohesion(body, queryBuffer, config);
    otherX += cohesion.x;
    otherY += cohesion.y;

    return { avoidanceX, avoidanceY, otherX, otherY };
};

export const computeWobbleForce = (
    body: PhysicsBody,
    config: ImpulseConfig,
    time: number,
): Vector2 => {
    const noise = config.noise;
    if (!noise || noise.magnitude <= 0) return zeroVector;

    const seed = body.seed ?? stringHash(String(body.id));
    const theta = time * noise.frequency + seed * Math.PI * 2;

    return {
        x: Math.cos(theta) * noise.magnitude,
        y: Math.sin(theta) * noise.magnitude,
    };
};

export {
    computeAnchorContribution,
    computeExternalForces,
    computeTargetForce,
} from "./ImpulseSteeringHelpers";
