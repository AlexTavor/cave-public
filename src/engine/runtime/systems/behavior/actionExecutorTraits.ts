import type {
    AddTraitAction,
    RemoveTraitAction,
} from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";
import type { BehaviorContext } from "./ValueResolver";

interface TraitInstance {
    id: string;
    remainingSeconds?: number;
    cycles?: Record<string, { accumulatorSeconds: number }>;
}

const enqueueTraitUpdate = (
    context: BehaviorContext,
    traits: TraitInstance[],
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    if (!context.self.id) return;
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_TRAITS_BATCH,
        payload: {
            updates: [{ entityId: context.self.id, traits }],
        },
    });
};

export const executeAddTraitAction = (
    action: AddTraitAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    const self = context.self as { traits?: TraitInstance[] };

    // Ensure the array exists on the live entity
    if (!Array.isArray(self.traits)) {
        self.traits = [];
    }

    if (self.traits.some((t) => t.id === action.traitId)) return;

    // Mutate in-place so concurrent systems in the same tick see the update
    self.traits.push({ id: action.traitId });

    // Enqueue the command for formal state synchronization
    enqueueTraitUpdate(context, [...self.traits], commands);
};

export const executeRemoveTraitAction = (
    action: RemoveTraitAction,
    context: BehaviorContext,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    const self = context.self as { traits?: TraitInstance[] };
    if (!Array.isArray(self.traits)) return;

    const idx = self.traits.findIndex((t) => t.id === action.traitId);
    if (idx === -1) return;

    // Mutate in-place so trailing systems (like TraitSystem) don't resurrect the trait
    self.traits.splice(idx, 1);

    // Enqueue the command for formal state synchronization
    enqueueTraitUpdate(context, [...self.traits], commands);
};
