import { z } from "zod";
import { BehaviorActionSchema } from "./behavior";
import { ConditionIdRefSchema } from "./conditions";
import { SelfDefinitionSchema } from "./selfDefinition";
import { EntityTargetSpecSchema } from "./targetSpec";

export const TutorialSelfDefinitionSchema = SelfDefinitionSchema;

export const TutorialGuidanceUseSchema = z
    .object({
        guidanceId: z.string().min(1),
        targetOverride: EntityTargetSpecSchema.optional(),
        titleOverride: z.string().optional(),
        textOverride: z.string().optional(),
    })
    .strict();

export const TutorialDefinitionSchema = z
    .object({
        id: z.string().min(1),
        selfDefinition: TutorialSelfDefinitionSchema.default({ kind: "auto" }),
        enterConditionIds: z.array(ConditionIdRefSchema).default([]),
        guidances: z.array(TutorialGuidanceUseSchema).default([]),
        onComplete: z.array(BehaviorActionSchema).default([]),
        exitConditionIds: z.array(ConditionIdRefSchema).default([]),
    })
    .strict();

export const TutorialsSchema = z
    .array(TutorialDefinitionSchema)
    .superRefine((tutorials, context) => {
        const seen = new Set<string>();
        tutorials.forEach((tutorial, index) => {
            if (seen.has(tutorial.id)) {
                context.addIssue({
                    code: "custom",
                    message: `Duplicate tutorial id '${tutorial.id}'.`,
                    path: [index, "id"],
                });
            }
            seen.add(tutorial.id);
        });
    });

export type TutorialDefinition = z.infer<typeof TutorialDefinitionSchema>;
export type TutorialGuidanceUse = z.infer<typeof TutorialGuidanceUseSchema>;
export type TutorialSelfDefinition = z.infer<
    typeof TutorialSelfDefinitionSchema
>;
