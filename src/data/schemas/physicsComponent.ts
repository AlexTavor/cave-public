import { z } from "zod";
import {
    PHYSICS_DEFAULT_DRAG,
    PHYSICS_DEFAULT_MASS,
    PHYSICS_DEFAULT_RADIUS,
    PHYSICS_DEFAULT_X,
    PHYSICS_DEFAULT_Y,
    PHYSICS_POSITION_MIN,
} from "./physicsConstants";
import { AnchorSchema } from "./physicsAnchors";

export const PhysicsComponentSchema = z.object({
    mass: z.number().min(0.1).default(PHYSICS_DEFAULT_MASS),
    radius: z.number().min(1).default(PHYSICS_DEFAULT_RADIUS),
    drag: z.number().min(0).max(1).default(PHYSICS_DEFAULT_DRAG),
    isStatic: z.boolean().default(false),
    x: z.number().min(PHYSICS_POSITION_MIN).default(PHYSICS_DEFAULT_X),
    y: z.number().min(PHYSICS_POSITION_MIN).default(PHYSICS_DEFAULT_Y),
    anchor: AnchorSchema.optional(),
});

export type PhysicsComponent = z.infer<typeof PhysicsComponentSchema>;

