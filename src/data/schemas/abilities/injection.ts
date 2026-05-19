import { z } from "zod";
import { Op } from "../primitives";

export const InjectionAbilitySchema = z.object({
    targetTag: z.string(),
    effects: z.array(
        z.object({
            op: z.enum(Op),
            target: z.string(),
            value: z.number(),
        }),
    ),
});

export type InjectionAbilityConfig = z.infer<typeof InjectionAbilitySchema>;
