import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { RuntimeCommand } from "../../../engine/runtime/types";
import { CinematicEventBridge } from "./CinematicEventBridge";

export const evaluateCinematicCommands = (commands: RuntimeCommand[]): void => {
    for (const command of commands) {
        if (command.type !== RuntimeCommandType.SHOW_CINEMATIC) continue;
        CinematicEventBridge.push({ lines: command.payload.lines });
    }
};
