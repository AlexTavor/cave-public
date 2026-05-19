import { z } from "zod";

export enum Op {
    SET = "SET",
    ADD = "ADD",
    SUB = "SUB",
    MULT = "MULT",
    DIV = "DIV",
}

export const LogicSentenceSchema = z.string().describe("ui:logic-sentence");

export const SelectorSchema = z.object({
    from: LogicSentenceSchema,
    mode: z.enum(["ALL", "RANDOM", "WEIGHTED_RANDOM", "HIGHEST", "LOWEST"]),
    count: z.union([z.number(), LogicSentenceSchema]).optional().default(1),
    weight: z.union([z.number(), LogicSentenceSchema]).optional(),
});

export const ValueNodeSchema = z.object({
    ref: LogicSentenceSchema.optional(),
    value: z.number().optional(),
    op: z.enum(Op).default(Op.ADD),
});

export const GameValueSchema = z.union([
    z.number(),
    z.boolean(),
    LogicSentenceSchema,
    z.array(ValueNodeSchema),
]);

export type GameValue = z.infer<typeof GameValueSchema>;

export const ConditionSchema = z.object({
    ref: LogicSentenceSchema,
    op: z.enum(["GT", "LT", "EQ", "GTE", "LTE", "NEQ"]),
    value: GameValueSchema,
});

export const EffectSchema = z.object({
    op: z.enum(Op),
    target: z.union([LogicSentenceSchema, SelectorSchema]),
    source: LogicSentenceSchema.optional(),
    value: GameValueSchema.optional(),
});

export type Effect = z.infer<typeof EffectSchema>;

