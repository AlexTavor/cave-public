import { z } from "zod";

export const SelfDefinitionSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("auto") }).strict(),
    z
        .object({ kind: z.literal("entity_id"), entityId: z.string().min(1) })
        .strict(),
    z
        .object({ kind: z.literal("entity_tag"), tag: z.string().min(1) })
        .strict(),
    z
        .object({ kind: z.literal("spawned_with_tag"), tag: z.string().min(1) })
        .strict(),
]);

export type SelfDefinition = z.infer<typeof SelfDefinitionSchema>;
