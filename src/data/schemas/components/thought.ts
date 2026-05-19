import { z } from "zod";
import { FactScopeSchema } from "../conditions";

export const ThoughtResumeStatusSchema = z.enum(["running", "paused"]);

export const ThoughtComponentSchema = z.object({
    _tag: z.literal("thought"),
    active: z.boolean(),
    thoughtId: z.string().nullable(),
    body: z.string(),
    rememberScope: FactScopeSchema.nullable(),
    resumeStatus: ThoughtResumeStatusSchema,
});

export const DEFAULT_THOUGHT_COMPONENT = ThoughtComponentSchema.parse({
    _tag: "thought",
    active: false,
    thoughtId: null,
    body: "",
    rememberScope: null,
    resumeStatus: "paused",
});

export type ThoughtComponent = z.infer<typeof ThoughtComponentSchema>;
export type ThoughtResumeStatus = z.infer<typeof ThoughtResumeStatusSchema>;
