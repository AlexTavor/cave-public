import { CommandDefinition } from "../../../../lib/terminal";
import { useTelemetryStore } from "../../state/useTelemetryStore";
import {
    tickRunSchema,
    buildInvalidArgsResult,
    STATUS_KEY,
} from "../runtimeConstants";

export const tickRunCommand: CommandDefinition = {
    name: "tick.run",
    description: "Start the runtime tick loop",
    usage: "tick.run",
    execute: (args, context) => {
        const parsed = tickRunSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("tick.run");

        if (!context.runtime?.play) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        context.runtime.play();
        useTelemetryStore.getState().setSticky(STATUS_KEY, "running");
        return { type: "success", content: "Tick loop started." };
    },
    autocomplete: () => [],
};
