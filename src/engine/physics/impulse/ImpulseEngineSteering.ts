import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { ImpulseForceField } from "./ImpulseForceField";
import { buildSpatialIndex } from "./ImpulseSpatialIndex";
import { applySteeringForBody } from "./ImpulseSteeringApply";
import type { PhysicsBody } from "./types";
import { isHardAnchored } from "./ImpulseEngineUtils";

export const applySteeringStep = (params: {
    bodies: Map<string, PhysicsBody>;
    config: ImpulseConfig;
    queryBuffer: PhysicsBody[];
    externalFields: ImpulseForceField[];
    worldWidth: number | null;
    worldHeight: number | null;
    time: number;
}): void => {
    const {
        bodies,
        config,
        queryBuffer,
        externalFields,
        worldWidth,
        worldHeight,
        time,
    } = params;

    const spatialIndex = buildSpatialIndex(bodies, config, {
        width: worldWidth,
        height: worldHeight,
    });

    try {
        for (const body of bodies.values()) {
            if (body.isStatic || isHardAnchored(body)) continue;
            applySteeringForBody({
                body,
                spatialIndex,
                config,
                queryBuffer,
                bodies,
                externalFields,
                time,
            });
        }
    } finally {
        spatialIndex?.release();
    }
};
