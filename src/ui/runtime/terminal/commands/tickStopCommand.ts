import { CommandDefinition } from "../../../../lib/terminal";
import { useTelemetryStore } from "../../state/useTelemetryStore";
import {
    tickStopSchema,
    buildInvalidArgsResult,
    STATUS_KEY,
} from "../runtimeConstants";

export const tickStopCommand: CommandDefinition = {
    name: "tick.stop",
    description: "Stop the runtime tick loop",
    usage: "tick.stop",
    execute: (args, context) => {
        const parsed = tickStopSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("tick.stop");

        if (!context.runtime?.pause) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        context.runtime.pause();
        useTelemetryStore.getState().setSticky(STATUS_KEY, "paused");
        return { type: "success", content: "Tick loop stopped." };
    },
    autocomplete: () => [],
};
