import { z } from "zod";
import { HabitusEffectSchema } from "./habiti";

export const UnderstandingDefinitionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().default(""),
    effects: z.array(HabitusEffectSchema).default([]),
});

export type UnderstandingDefinition = z.infer<
    typeof UnderstandingDefinitionSchema
>;
