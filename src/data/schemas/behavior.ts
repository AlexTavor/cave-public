import { nanoid } from "nanoid";
import { ulid } from "ulid";
import { z } from "zod";
import { ShowCinematicActionSchema } from "./behaviorCinematic";
export { ActionValueSchema } from "./behaviorCoreSchemas";
import {
    AddTraitActionSchema,
    createSpawnCarrierActionSchema,
    DispatchActionSchema,
    GainHabitiActionSchema,
    GainUnderstandingActionSchema,
    KillActionSchema,
    KillAllBodiesExceptActionSchema,
    MutateActionSchema,
    PatchBlueprintActionSchema,
    RemoveTraitActionSchema,
    SpawnActionSchema,
    SpawnBodyActionSchema,
    TransferActionSchema,
} from "./behaviorCoreSchemas";
import {
    type BehaviorAction,
    type BehaviorComponent,
    type BehaviorRule,
    type TriggerDraftAction,
} from "./behaviorTypes";
import { LogicRuleSchema } from "./logic";
import { ShowNotificationAbilityGuidanceActionSchema } from "./behaviorNotificationAbilityGuidance";

export const TriggerDraftActionSchema = z.object({
    type: z.literal("TRIGGER_DRAFT"),
    poolId: z.string(),
    count: z.number().int().min(1).optional(),
    label: z.string().optional(),
    triggerEntityId: z.string().optional(),
    onComplete: z.array(z.lazy(() => BehaviorActionSchema)).optional(),
}) as z.ZodType<TriggerDraftAction>;

export const SpawnCarrierActionSchema = createSpawnCarrierActionSchema(
    () => BehaviorActionSchema,
) as z.ZodType<BehaviorAction>;

export const BehaviorActionSchema = z.lazy(() =>
    z.union([
        MutateActionSchema,
        TransferActionSchema,
        SpawnActionSchema,
        SpawnBodyActionSchema,
        KillActionSchema,
        KillAllBodiesExceptActionSchema,
        PatchBlueprintActionSchema,
        AddTraitActionSchema,
        RemoveTraitActionSchema,
        DispatchActionSchema,
        GainUnderstandingActionSchema,
        GainHabitiActionSchema,
        SpawnCarrierActionSchema,
        TriggerDraftActionSchema,
        ShowNotificationAbilityGuidanceActionSchema,
        ShowCinematicActionSchema,
    ]),
) as z.ZodType<BehaviorAction>;

export const BehaviorRuleSchema = z.preprocess(
    (val) => {
        if (typeof val === "object" && val !== null && !("sortKey" in val)) {
            return { ...val, sortKey: ulid() };
        }
        return val;
    },
    z.object({
        id: z.string().default(() => nanoid()),
        sortKey: z.string(),
        conditions: z.array(LogicRuleSchema).default([]),
        actions: z.array(BehaviorActionSchema).default([]),
    }),
) as z.ZodType<BehaviorRule>;

export const BehaviorComponentSchema: z.ZodType<BehaviorComponent> = z.object({
    rules: z.array(BehaviorRuleSchema).default([]),
});

export type {
    ActionValue,
    AddTraitAction,
    BehaviorAction,
    BehaviorComponent,
    BehaviorRule,
    DispatchAction,
    GainHabitiAction,
    GainUnderstandingAction,
    KillAction,
    KillAllBodiesExceptAction,
    MutateAction,
    PatchBlueprintAction,
    RemoveTraitAction,
    SpawnAction,
    SpawnCarrierAction,
    SpawnBodyAction,
    TransferAction,
    TriggerDraftAction,
} from "./behaviorTypes";
export type { ShowCinematicAction } from "./behaviorCinematic";
export type { ShowNotificationAbilityGuidanceAction } from "./behaviorNotificationAbilityGuidance";

