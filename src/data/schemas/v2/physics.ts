import { z } from "zod";
import { AnchorSchema } from "../physicsAnchors";

export const PhysicsComponentV2Schema = z.object({
    mass: z.number().min(0.1).default(1),
    drag: z.number().min(0).max(1).default(0.1),
    isStatic: z.boolean().default(false),
    anchor: AnchorSchema.optional(),
});

export type PhysicsComponentV2 = z.infer<typeof PhysicsComponentV2Schema>;
