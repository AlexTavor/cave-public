import { z } from "zod";
import { PHYSICS_DEFAULT_DRAG, PHYSICS_DEFAULT_MASS } from "./physicsConstants";

const ImpulseNoiseSchema = z.object({
    magnitude: z.number().min(0).default(0),
    frequency: z.number().min(0).default(0),
});

export const ImpulseConfigSchema = z.object({
    globalDrag: z
        .number()
        .min(0)
        .max(1)
        .default(0.9)
        .describe("ui:slider;min=0;max=1;step=0.01"),
    maxSubSteps: z.number().min(1).max(16).default(8).describe("ui:hidden"),
    defaultDtMs: z.number().min(1).default(16).describe("ui:hidden"),
    minWorldSize: z.number().min(1).default(1).describe("ui:hidden"),
    defaultQueryRadius: z.number().min(1).default(60).describe("ui:hidden"),
    separationRadiusMultiplier: z
        .number()
        .min(0)
        .default(3)
        .describe("ui:hidden"),
    subSteps: z
        .number()
        .min(1)
        .default(1)
        .describe(
            "ui:slider;min=1;max=8;step=1|tooltip:Physics sub-steps per frame",
        ),
    separationStrength: z
        .number()
        .min(0)
        .max(20)
        .default(1)
        .describe(
            "ui:slider;min=0;max=20;step=0.05|tooltip:Repulsion force between entities",
        ),
    avoidanceForce: z
        .number()
        .min(0)
        .default(2)
        .describe(
            "ui:slider;min=0;max=20;step=0.1|tooltip:Obstacle avoidance force",
        ),
    lookAheadDistance: z
        .number()
        .min(0)
        .default(40)
        .describe(
            "ui:slider;min=0;max=200;step=1|tooltip:Obstacle look-ahead distance",
        ),
    alignmentWeight: z
        .number()
        .min(0)
        .default(0.5)
        .describe(
            "ui:slider;min=0;max=20;step=0.05|tooltip:Flocking alignment weight",
        ),
    cohesionWeight: z
        .number()
        .min(0)
        .default(0.1)
        .describe(
            "ui:slider;min=0;max=20;step=0.05|tooltip:Flocking cohesion weight",
        ),
    flockingRadius: z
        .number()
        .min(0)
        .default(60)
        .describe(
            "ui:slider;min=0;max=200;step=1|tooltip:Neighbor search radius for flocking",
        ),
    avoidanceDamp: z
        .number()
        .min(0)
        .max(1)
        .default(0.1)
        .describe(
            "ui:slider;min=0;max=1;step=0.01|tooltip:Avoidance damping factor",
        ),
    seekStrength: z
        .number()
        .min(0)
        .default(500)
        .describe(
            "ui:slider;min=0;max=1000;step=1|tooltip:Target-seeking force",
        ),
    transferNodeRadius: z
        .number()
        .min(0)
        .default(3)
        .describe(
            "ui:slider;min=0;max=60;step=1|tooltip:Transfer node collision radius",
        ),
    transferNodeMass: z
        .number()
        .min(0)
        .default(PHYSICS_DEFAULT_MASS)
        .describe("ui:hidden"),
    transferNodeDrag: z
        .number()
        .min(0)
        .max(1)
        .default(PHYSICS_DEFAULT_DRAG)
        .describe("ui:hidden"),
    noise: ImpulseNoiseSchema.optional(),
});

export type ImpulseConfig = z.infer<typeof ImpulseConfigSchema>;

