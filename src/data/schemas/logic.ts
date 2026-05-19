import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";

export const LogicKeywordSchema = z.enum(["IF", "AND", "OR", "NOT"]);

const LogicNumericValueSchema = z.preprocess((input) => {
    if (typeof input !== "string") return input;
    const trimmed = input.trim();
    if (!trimmed) return input;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : input;
}, z.number());

export const LogicTokenSchema = z.discriminatedUnion("t", [
    z.object({ t: z.literal("keyword"), v: LogicKeywordSchema }),
    z.object({ t: z.literal("ref"), v: z.string() }),
    z.object({ t: z.literal("op"), v: z.string() }),
    z.object({ t: z.literal("val"), v: LogicNumericValueSchema }),
]);

export const LogicRuleSchema = z.preprocess(
    (val) => {
        if (typeof val === "object" && val !== null && !("sortKey" in val)) {
            return { ...val, sortKey: ulid() };
        }
        return val;
    },
    z
        .object({
            id: z.string().default(() => nanoid()),
            sortKey: z.string(),
            tokens: z.array(LogicTokenSchema).default([]),
            compiled: z.unknown().optional(),
        })
        .describe("ui:logic-rule"),
);

export type LogicKeyword = z.infer<typeof LogicKeywordSchema>;
export type LogicToken = z.infer<typeof LogicTokenSchema>;
export type LogicRule = z.infer<typeof LogicRuleSchema>;
