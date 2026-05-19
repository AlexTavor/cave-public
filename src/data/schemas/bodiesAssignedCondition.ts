import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";

export const BodiesAssignedConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("bodies_assigned"),
});
