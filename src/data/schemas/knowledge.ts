import { z } from "zod";
import { ConditionIdRefSchema } from "./conditions";
import { EntityTargetSpecSchema } from "./targetSpec";

export const KnowledgeEntrySchema = z
    .object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: z.string().default(""),
        guidanceId: z.string().min(1),
        targetOverride: EntityTargetSpecSchema.optional(),
        textOverride: z.string().optional(),
        unlockConditionIds: z.array(ConditionIdRefSchema).default([]),
    })
    .strict();

export const KnowledgeSchema = z
    .array(KnowledgeEntrySchema)
    .superRefine((entries, context) => {
        const seen = new Set<string>();
        entries.forEach((entry, index) => {
            if (seen.has(entry.id)) {
                context.addIssue({
                    code: "custom",
                    message: `Duplicate knowledge id '${entry.id}'.`,
                    path: [index, "id"],
                });
            }
            seen.add(entry.id);
        });
    });

export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;
