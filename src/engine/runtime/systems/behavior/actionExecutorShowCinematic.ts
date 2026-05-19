import type { ShowCinematicAction } from "../../../../data/schemas/behaviorCinematic";
import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";

export const executeShowCinematicAction = (
    action: ShowCinematicAction,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.SHOW_CINEMATIC,
        payload: { lines: [...action.lines] },
    });
};
