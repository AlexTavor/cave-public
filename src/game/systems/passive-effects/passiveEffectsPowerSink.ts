import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";

const SINK_FIELDS = new Set(["baseDemand", "maxDemand"]);

export const enqueuePowerSinkUpdate = (
    commands: CommandBuffer<RuntimeCommand>,
    entityId: string,
    fullPath: string,
    finalValue: number,
) => {
    const target = fullPath.replace("self.powerSink.", "");
    const [field, attr] = target.split(".");
    if (!SINK_FIELDS.has(field) || !attr) return;
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_POWER_SINK,
        payload: {
            entityId,
            [field]: { [attr]: finalValue },
        },
    });
};
