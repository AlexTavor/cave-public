import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { ImpulseForceField } from "./ImpulseForceField";
import type { SpatialIndex } from "./ImpulseSpatialIndex";
import type { PhysicsBody } from "./types";
import {
    computeAnchorContribution,
    computeExternalForces,
    computeSpatialForces,
    computeTargetForce,
    computeWobbleForce,
} from "./ImpulseSteeringForces";
import { stringHash } from "../../../utils/deterministicHash";

const EPSILON = 1e-6;

export const applySteeringForBody = (params: {
    body: PhysicsBody;
    spatialIndex: SpatialIndex | null;
    config: ImpulseConfig;
    queryBuffer: PhysicsBody[];
    bodies: Map<string, PhysicsBody>;
    externalFields: ImpulseForceField[];
    time: number;
}): void => {
    const { body, spatialIndex, config, queryBuffer, bodies, externalFields } =
        params;
    const { time } = params;

    const spatial = computeSpatialForces({
        body,
        spatialIndex,
        config,
        queryBuffer,
    });
    const target = computeTargetForce({ body, bodies, config });
    const anchor = computeAnchorContribution({ body, bodies });
    const external = computeExternalForces({ body, config, externalFields });
    const wobble = computeWobbleForce(body, config, time);

    const otherX = spatial.otherX + target.x + anchor.x + wobble.x;
    const otherY = spatial.otherY + target.y + anchor.y + wobble.y;
    const avoidanceMagnitude = Math.hypot(
        spatial.avoidanceX,
        spatial.avoidanceY,
    );

    const seedValue = body.seed ?? stringHash(String(body.id));
    const tieBreakMagnitude = Math.max(
        1,
        config.avoidanceForce * 0.25,
        Math.abs(spatial.avoidanceX) * 0.05,
    );
    const tieBreak = seedValue >= 0.5 ? tieBreakMagnitude : -tieBreakMagnitude;
    const avoidY =
        avoidanceMagnitude > 0 && Math.abs(spatial.avoidanceX) > EPSILON
            ? spatial.avoidanceY + tieBreak
            : spatial.avoidanceY;
    const adjustedAvoidY =
        avoidanceMagnitude > 0 && Math.abs(avoidY) < 1
            ? Math.sign(avoidY || tieBreak) * 1
            : avoidY;

    if (avoidanceMagnitude > 0) {
        const damp = Math.max(0, Math.min(1, config.avoidanceDamp));
        const avoidanceScale = Math.max(1, config.avoidanceForce * 0.5);
        body.acceleration.x +=
            spatial.avoidanceX * avoidanceScale + otherX + external.x * damp;
        body.acceleration.y +=
            adjustedAvoidY * avoidanceScale + otherY + external.y * damp;
        return;
    }

    body.acceleration.x += otherX + external.x;
    body.acceleration.y += otherY + external.y;
};
