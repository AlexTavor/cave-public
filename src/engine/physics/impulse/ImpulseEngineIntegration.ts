import type { ImpulseConfig } from "../../../data/schemas/physics";
import { stepVerlet } from "./VerletIntegrator";
import type { PhysicsBody } from "./types";
import { isHardAnchored } from "./ImpulseEngineUtils";

const clampToBounds = (
    body: PhysicsBody,
    config: ImpulseConfig,
    worldWidth: number | null,
    worldHeight: number | null,
): void => {
    if (body.isStatic) return;
    if (worldWidth === null || worldHeight === null) return;

    if (worldWidth < config.minWorldSize || worldHeight < config.minWorldSize) {
        return;
    }

    const x = Math.min(Math.max(body.position.x, 0), worldWidth);
    const y = Math.min(Math.max(body.position.y, 0), worldHeight);

    body.position = { x, y };
};

export const integrateBodies = (params: {
    bodies: Map<string, PhysicsBody>;
    config: ImpulseConfig;
    worldWidth: number | null;
    worldHeight: number | null;
    stepSeconds: number;
    timeCorrection: number;
}): void => {
    const {
        bodies,
        config,
        worldWidth,
        worldHeight,
        stepSeconds,
        timeCorrection,
    } = params;

    for (const body of bodies.values()) {
        if (isHardAnchored(body)) continue;

        let activeCorrection = timeCorrection;

        if (body.velocity) {
            body.prevPosition.x =
                body.position.x - body.velocity.x * stepSeconds;
            body.prevPosition.y =
                body.position.y - body.velocity.y * stepSeconds;
            body.velocity = undefined;

            activeCorrection = 1;
        }

        stepVerlet(body, stepSeconds, config.globalDrag, activeCorrection);
        clampToBounds(body, config, worldWidth, worldHeight);
        body.x = body.position.x;
        body.y = body.position.y;
    }
};
