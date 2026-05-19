import type { ImpulseConfig } from "./impulseConfig";
import { PHYSICS_DEFAULT_DRAG, PHYSICS_DEFAULT_MASS } from "./physicsConstants";

export const DEFAULT_IMPULSE_CONFIG: ImpulseConfig = {
    globalDrag: 0.9,
    maxSubSteps: 8,
    defaultDtMs: 16,
    minWorldSize: 1,
    defaultQueryRadius: 60,
    separationRadiusMultiplier: 3,
    subSteps: 1,
    separationStrength: 1,
    avoidanceForce: 2,
    lookAheadDistance: 40,
    alignmentWeight: 0.5,
    cohesionWeight: 0.1,
    flockingRadius: 60,
    avoidanceDamp: 0.1,
    seekStrength: 500,
    transferNodeRadius: 3,
    transferNodeMass: PHYSICS_DEFAULT_MASS,
    transferNodeDrag: PHYSICS_DEFAULT_DRAG,
    noise: { magnitude: 0, frequency: 0 },
};

export const mergeImpulseConfig = (
    overrides?: Partial<ImpulseConfig>,
): ImpulseConfig => ({
    ...DEFAULT_IMPULSE_CONFIG,
    ...overrides,
});

