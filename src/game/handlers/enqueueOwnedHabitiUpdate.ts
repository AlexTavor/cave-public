import { RuntimeCommandType } from "../../engine/runtime/types";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";

const normalized = (ids: string[]) =>
    [...new Set(ids)].sort((a, b) => a.localeCompare(b));

export const enqueueOwnedHabitiUpdate = (input: {
    commands: CommandBuffer<RuntimeCommand>;
    entityId: string;
    currentOwnedHabiti: string[];
    nextOwnedHabiti: string[];
}) => {
    const current = normalized(input.currentOwnedHabiti);
    const next = normalized(input.nextOwnedHabiti);
    if (JSON.stringify(current) === JSON.stringify(next)) return;
    input.commands.enqueue({
        type: RuntimeCommandType.UPDATE_CAVE,
        payload: {
            entityId: input.entityId,
            ownedHabiti: next,
        },
    });
};
