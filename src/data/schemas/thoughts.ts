import { z } from "zod";
import { FactScopeSchema, StructuredConditionSchema } from "./conditions";

export const ThoughtDefinitionSchema = z.object({
    id: z.string().min(1),
    body: z.string(),
    rememberScope: FactScopeSchema,
    conditions: z.array(StructuredConditionSchema).default([]),
});

export const ThoughtsSchema = z
    .array(ThoughtDefinitionSchema)
    .superRefine((thoughts, context) => {
        const seen = new Set<string>();
        thoughts.forEach((thought, index) => {
            if (seen.has(thought.id)) {
                context.addIssue({
                    code: "custom",
                    message: `Duplicate thought id '${thought.id}'.`,
                    path: [index, "id"],
                });
            }
            seen.add(thought.id);
        });
    });

export type ThoughtDefinition = z.infer<typeof ThoughtDefinitionSchema>;
