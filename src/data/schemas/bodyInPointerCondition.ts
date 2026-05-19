import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";

export const BodyInPointerConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("body_in_pointer"),
});
