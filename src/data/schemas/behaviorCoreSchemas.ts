import { z } from "zod";
import type {
    ActionValue,
    AddTraitAction,
    DispatchAction,
    GainHabitiAction,
    GainUnderstandingAction,
    KillAction,
    KillAllBodiesExceptAction,
    MutateAction,
    PatchBlueprintAction,
    RemoveTraitAction,
    SpawnAction,
    SpawnBodyAction,
    TransferAction,
} from "./behaviorTypes";

export const ActionValueSchema: z.ZodType<ActionValue> = z.union([
    z.number(),
    z.string(),
]);

export const MutateActionSchema: z.ZodType<MutateAction> = z.object({
    type: z.literal("MUTATE"),
    target: z.string(),
    op: z.enum(["SET", "ADD", "SUB"]),
    value: ActionValueSchema,
});

export const TransferActionSchema: z.ZodType<TransferAction> = z.object({
    type: z.literal("TRANSFER"),
    source: z.string(),
    target: z.string(),
    resource: z.string(),
    amount: ActionValueSchema,
    isImmediate: z.boolean().optional(),
});

export const SpawnActionSchema: z.ZodType<SpawnAction> = z.object({
    type: z.literal("SPAWN"),
    blueprintId: z.string(),
    id: z.string().optional(),
    parentId: z.string().optional(),
    forcedHabiti: z.array(z.string()).optional(),
});

export const SpawnBodyActionSchema: z.ZodType<SpawnBodyAction> = z.object({
    type: z.literal("SPAWN_BODY"),
    blueprintId: z.string(),
    target: z.string().optional(),
    parentId: z.string().optional(),
    forcedHabiti: z.array(z.string()).optional(),
});

export const KillActionSchema: z.ZodType<KillAction> = z.object({
    type: z.literal("KILL"),
    entityId: z.string(),
});

export const KillAllBodiesExceptActionSchema: z.ZodType<KillAllBodiesExceptAction> =
    z.object({
        type: z.literal("KILL_ALL_BODIES_EXCEPT"),
        quantity: z.number().int().min(0),
    });

export const PatchBlueprintActionSchema: z.ZodType<PatchBlueprintAction> =
    z.object({
        type: z.literal("PATCH_BLUEPRINT"),
        blueprintId: z.string(),
        components: z.record(z.string(), z.unknown()),
    });

export const AddTraitActionSchema: z.ZodType<AddTraitAction> = z.object({
    type: z.literal("ADD_TRAIT"),
    traitId: z.string(),
});

export const RemoveTraitActionSchema: z.ZodType<RemoveTraitAction> = z.object({
    type: z.literal("REMOVE_TRAIT"),
    traitId: z.string(),
});

export const DispatchActionSchema: z.ZodType<DispatchAction> = z.object({
    type: z.literal("DISPATCH"),
    entity: z.string(),
    target: z.string(),
});

export const GainUnderstandingActionSchema: z.ZodType<GainUnderstandingAction> =
    z.object({
        type: z.literal("GAIN_UNDERSTANDING"),
        understandingId: z.string(),
        entityId: z.string().optional(),
    });

export const GainHabitiActionSchema: z.ZodType<GainHabitiAction> = z.object({
    type: z.literal("GAIN_HABITI"),
    habitusId: z.string(),
    entityId: z.string().optional(),
});

export const createSpawnCarrierActionSchema = (
    getBehaviorActionSchema: () => z.ZodTypeAny,
) =>
    z.object({
        type: z.literal("SPAWN_CARRIER"),
        tags: z.array(z.string()).min(1),
        commands: z.array(z.lazy(getBehaviorActionSchema)).min(1),
    });
