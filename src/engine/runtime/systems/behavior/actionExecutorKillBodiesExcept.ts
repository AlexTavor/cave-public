import type { CommandBuffer, RuntimeCommand } from "../../types";
import { RuntimeCommandType } from "../../types";

export const executeKillBodiesExceptAction = (
    quantity: number,
    commands: CommandBuffer<RuntimeCommand>,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
        payload: { quantity },
    });
};
