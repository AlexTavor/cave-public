import { z } from "zod";

const finiteNumber = z
    .number()
    .refine(Number.isFinite, "Expected finite number");
const displayDescription = z.string().default("");

export const HabitusEffectSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("add_cave_attribute"),
        attribute: z.enum(["body", "mind", "social"]),
        amount: finiteNumber,
        description: displayDescription,
    }),
    z.object({
        type: z.literal("add_absorption_xp_conversion"),
        amount: finiteNumber,
        description: displayDescription,
    }),
    z.object({
        type: z.literal("add_resource_gain_multiplier"),
        resource: z.string().min(1),
        amount: finiteNumber,
        description: displayDescription,
    }),
    z.object({
        type: z.literal("add_producer_output_multiplier"),
        producerTag: z.string().min(1),
        amount: finiteNumber,
        description: displayDescription,
    }),
    z.object({
        type: z.literal("increase_max_purge"),
        amount: finiteNumber,
        description: displayDescription,
    }),
]);

export type HabitusEffect = z.infer<typeof HabitusEffectSchema>;
