import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";
import {
    CAVE_STATUS_ABOUTS,
    FactScopeSchema,
    FactTypeSchema,
    StructuredConditionOperatorSchema,
    UserInteractionStateSchema,
} from "./conditionPrimitives";
import {
    BodiesAssignedConditionSchema,
    BodyInPointerConditionSchema,
    CarriersOrbitingConditionSchema,
    DestructiveAssignmentHasAllBodiesConditionSchema,
} from "./conditionLeafSchemas";
import { SelfDefinitionSchema } from "./selfDefinition";

export const ConditionIdRefSchema = z.string().min(1);

export {
    FactScopeSchema,
    FactTypeSchema,
    StructuredConditionOperatorSchema,
    UserInteractionStateSchema,
} from "./conditionPrimitives";

const FactThresholdConditionSchema = z
    .object({
        id: z.string().default(() => nanoid()),
        sortKey: z.string().default(() => ulid()),
        kind: z.literal("fact_threshold"),
        scope: FactScopeSchema,
        factType: FactTypeSchema,
        factAbout: z.string().min(1),
        operator: StructuredConditionOperatorSchema,
        value: z.number(),
    })
    .superRefine((condition, context) => {
        if (
            condition.factType === "cave_status" &&
            !CAVE_STATUS_ABOUTS.has(condition.factAbout)
        ) {
            context.addIssue({
                code: "custom",
                message: "cave_status factAbout must be 'heat' or 'food'.",
                path: ["factAbout"],
            });
        }
    });

const WorldStateThresholdConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("world_state_threshold"),
    key: z.string().min(1),
    operator: StructuredConditionOperatorSchema,
    value: z.number(),
});

const EntityTagPresentConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("entity_tag_present"),
    tag: z.string().min(1),
});

const WorldStateBooleanConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("world_state_boolean"),
    key: z.string().min(1),
    value: z.boolean(),
});

const UserInteractionConditionSchema = z.object({
    id: z.string().default(() => nanoid()),
    sortKey: z.string().default(() => ulid()),
    kind: z.literal("user_interaction"),
    interaction: UserInteractionStateSchema,
});

export const StructuredConditionSchema = z.discriminatedUnion("kind", [
    FactThresholdConditionSchema,
    WorldStateThresholdConditionSchema,
    EntityTagPresentConditionSchema,
    WorldStateBooleanConditionSchema,
    UserInteractionConditionSchema,
    BodiesAssignedConditionSchema,
    BodyInPointerConditionSchema,
    CarriersOrbitingConditionSchema,
    DestructiveAssignmentHasAllBodiesConditionSchema,
]);

export const ConditionDefinitionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    selfDefinition: SelfDefinitionSchema.default({ kind: "auto" }),
    conditions: z.array(StructuredConditionSchema).default([]),
});

export const ConditionsSchema = z
    .array(ConditionDefinitionSchema)
    .superRefine((conditions, context) => {
        const seen = new Set<string>();
        conditions.forEach((condition, index) => {
            if (seen.has(condition.id)) {
                context.addIssue({
                    code: "custom",
                    message: `Duplicate condition id '${condition.id}'.`,
                    path: [index, "id"],
                });
            }
            seen.add(condition.id);
        });
    });

export type FactScope = z.infer<typeof FactScopeSchema>;
export type FactType = z.infer<typeof FactTypeSchema>;
export type ConditionDefinition = z.infer<typeof ConditionDefinitionSchema>;
export type ConditionSelfDefinition = z.infer<typeof SelfDefinitionSchema>;
export type StructuredConditionInput = z.input<
    typeof StructuredConditionSchema
>;
export type StructuredCondition = z.infer<typeof StructuredConditionSchema>;
export type UserInteractionState = z.infer<typeof UserInteractionStateSchema>;
