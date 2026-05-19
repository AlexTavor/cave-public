import { z } from "zod";
import { BehaviorActionSchema } from "./behavior";
import { ConditionIdRefSchema } from "./conditions";
import { LogicRuleSchema } from "./logic";

export const DraftOptionBlueprintSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    rarity: z.enum(["none", "common", "rare", "legendary"]).default("none"),
    icon: z.string(),
    oneOff: z.boolean().optional(),
    conditionIds: z.array(ConditionIdRefSchema).optional(),
    conditions: z.array(LogicRuleSchema).optional(),
    payload: z.array(BehaviorActionSchema).default([]),
});

export const DraftPoolEntrySchema = z.object({
    optionId: z.string(),
    weight: z.number().min(0),
});

export const DraftPoolBlueprintSchema = z.object({
    id: z.string(),
    entries: z.array(DraftPoolEntrySchema).default([]),
    texts: z.array(z.string()).default([]),
});

export type DraftOptionBlueprint = z.infer<typeof DraftOptionBlueprintSchema>;
export type DraftPoolEntry = z.infer<typeof DraftPoolEntrySchema>;
export interface DraftPoolBlueprint {
    id: string;
    entries: DraftPoolEntry[];
    texts: string[];
}

