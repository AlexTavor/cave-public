import type {
    BodyUpdatePayload,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import {
    appendCommandMetadata,
    RuntimeCommandType,
} from "../../../engine/runtime/types";
import type { ProcessEntityResult } from "./processEntity";

export const collectBodyResult = (
    entityId: string | undefined,
    result: ProcessEntityResult,
    updates: BodyUpdatePayload[],
    killCommands: RuntimeCommand[],
) => {
    if (result.kill && entityId) {
        const command: RuntimeCommand = {
            type: RuntimeCommandType.KILL,
            payload: { entityId },
        };
        killCommands.push(
            result.deathCause === "starvation"
                ? appendCommandMetadata(command, { cause: "starvation" })
                : command,
        );
        return;
    }
    if (result.update) updates.push(result.update);
};
