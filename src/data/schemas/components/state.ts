import { z } from "zod";
import { GameValueSchema } from "../primitives";

export const StateEntrySchema = z.object({
    value: GameValueSchema,
    max: GameValueSchema.optional(),
    min: GameValueSchema.optional(),
    visible: z.boolean().default(false),
    allowDeposit: z.boolean().optional(),
    allowWithdraw: z.boolean().optional(),
    priority: z.number().optional(),
    scaleOnMaxChange: z.boolean().optional(),
    preserveValueOnMaxDecrease: z.boolean().optional(),
});

export const StateComponentSchema = z.record(z.string(), StateEntrySchema);

export type StateComponent = z.infer<typeof StateComponentSchema>;
