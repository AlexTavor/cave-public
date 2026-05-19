import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";

export const DestructiveAssignmentHasAllBodiesConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("destructive_assignment_has_all_bodies"),
});
