import { z } from "zod";
import { EntityTargetSpecSchema } from "../targetSpec";

export const ParentComponentSchema = z.union([
    z.object({ parentId: z.string().min(1) }).strict(),
    EntityTargetSpecSchema,
]);

export type ParentComponent = z.infer<typeof ParentComponentSchema>;
