import { z } from "zod";
import { HabitusEffectSchema } from "./habitusEffects";
export { HabitusEffectSchema } from "./habitusEffects";
export type { HabitusEffect } from "./habitusEffects";

export const HabitusTypeIdSchema = z.enum([
    "species",
    "gender",
    "social_category",
    "profession",
    "sexual_preference",
    "unique_body",
]);

const finiteNumber = z
    .number()
    .refine(Number.isFinite, "Expected finite number");
const stringList = z.array(z.string().min(1)).default([]);

export const HabitusDefinitionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().default(""),
    summary: z.string().default(""),
    type: HabitusTypeIdSchema,
    effects: z.array(HabitusEffectSchema).default([]),
    excludes: stringList,
});

export const WeightedHabitusPoolEntrySchema = z.object({
    habitusId: z.string().min(1),
    weight: finiteNumber.refine((value) => value > 0, "Expected weight > 0"),
});

export const HabitusTypeRuleSchema = z
    .object({
        habitusType: HabitusTypeIdSchema,
        probability: finiteNumber.refine(
            (value) => value >= 0 && value <= 1,
            "Expected probability in [0, 1]",
        ),
        maxCount: z.number().int().min(0),
        weightedPool: z.array(WeightedHabitusPoolEntrySchema).default([]),
    })
    .superRefine((rule, context) => {
        const seen = new Set<string>();
        rule.weightedPool.forEach((entry, index) => {
            if (!seen.has(entry.habitusId)) {
                seen.add(entry.habitusId);
                return;
            }
            context.addIssue({
                code: "custom",
                message: `Duplicate habitusId '${entry.habitusId}'.`,
                path: ["weightedPool", index, "habitusId"],
            });
        });
    });

export const BodySettingsSchema = z
    .object({
        habitusTypeRules: z.array(HabitusTypeRuleSchema).default([]),
    })
    .superRefine((settings, context) => {
        const seen = new Set<HabitusTypeId>();
        settings.habitusTypeRules.forEach((rule, index) => {
            if (!seen.has(rule.habitusType)) {
                seen.add(rule.habitusType);
                return;
            }
            context.addIssue({
                code: "custom",
                message: `Duplicate habitusType '${rule.habitusType}'.`,
                path: ["habitusTypeRules", index, "habitusType"],
            });
        });
    });

export type HabitusTypeId = z.infer<typeof HabitusTypeIdSchema>;
export type HabitusDefinition = z.infer<typeof HabitusDefinitionSchema>;
export type WeightedHabitusPoolEntry = z.infer<
    typeof WeightedHabitusPoolEntrySchema
>;
export type HabitusTypeRule = z.infer<typeof HabitusTypeRuleSchema>;
export type BodySettings = z.infer<typeof BodySettingsSchema>;
