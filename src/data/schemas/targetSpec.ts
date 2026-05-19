import { z } from "zod";

export const EntityTargetSpecSchema = z.discriminatedUnion("kind", [
    z
        .object({ kind: z.literal("entity_id"), entityId: z.string().min(1) })
        .strict(),
    z
        .object({ kind: z.literal("entity_tag"), tag: z.string().min(1) })
        .strict(),
]);

export type EntityTargetSpec = z.infer<typeof EntityTargetSpecSchema>;
