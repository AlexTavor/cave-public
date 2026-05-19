import { z } from "zod";
import { AttributeSetSchema } from "../game/body";

export const PowerSinkComponentSchema = z
    .object({
        baseDemand: AttributeSetSchema.default({
            body: 0,
            mind: 0,
            social: 0,
        }),
        maxDemand: AttributeSetSchema.optional(),
        throttle: z.number().min(0).max(1).default(1),
        efficiency: z.number().default(0),
        drawFraction: z.record(z.string(), z.number()).default({}),
        allocatedDraw: AttributeSetSchema.default({
            body: 0,
            mind: 0,
            social: 0,
        }),
        showThrottleSlider: z.boolean().default(true),
        status: z.enum(["nominal", "brownout", "blackout"]).default("blackout"),
    })
    .transform((data) => ({
        ...data,
        maxDemand: data.maxDemand ?? { ...data.baseDemand },
    }));

export type PowerSinkComponent = z.output<typeof PowerSinkComponentSchema>;

