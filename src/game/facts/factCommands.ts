import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { FactScope, FactType } from "../../data/schemas/conditions";

export const enqueueFactAdjust = (
    commands: CommandBuffer<RuntimeCommand>,
    scope: FactScope,
    factType: FactType,
    factAbout: string,
    delta: number,
) => {
    commands.enqueue({
        type: RuntimeCommandType.ADJUST_FACT,
        payload: { scope, factType, factAbout, delta },
    });
};

export const enqueueMirroredFactAdjust = (
    commands: CommandBuffer<RuntimeCommand>,
    factType: FactType,
    factAbout: string,
    delta: number,
) => {
    enqueueFactAdjust(commands, "run", factType, factAbout, delta);
    enqueueFactAdjust(commands, "permanent", factType, factAbout, delta);
};
