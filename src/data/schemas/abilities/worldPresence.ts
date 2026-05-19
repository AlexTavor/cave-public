import { z } from "zod";
import { SpatialRadiusSchema } from "../v2/spatial";

export const WorldPresenceAbilitySchema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    radius: SpatialRadiusSchema,
});

export type WorldPresenceAbilityConfig = z.infer<
    typeof WorldPresenceAbilitySchema
>;
