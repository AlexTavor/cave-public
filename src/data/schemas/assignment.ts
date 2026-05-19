import { z } from "zod";
import {
    AssignmentFilterRuleSchema,
    AssignmentMinimumRuleSchema,
} from "./assignmentRules";

export const AssignmentComponentSchema = z.object({
    slots: z.number(),
    filter: z.array(AssignmentFilterRuleSchema).default([]),
    minimums: z.array(AssignmentMinimumRuleSchema).default([]),
    locking: z.boolean().default(true),
    assignedIds: z.array(z.string()).default([]),
});

export type AssignmentComponent = z.infer<typeof AssignmentComponentSchema>;

