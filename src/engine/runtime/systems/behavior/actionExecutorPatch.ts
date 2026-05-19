import type { PatchBlueprintAction } from "../../../../data/schemas/behavior";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";

export const executePatchAction = (
    action: PatchBlueprintAction,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.PATCH_BLUEPRINT,
        payload: {
            blueprintId: action.blueprintId,
            components: action.components,
        },
    });
};
