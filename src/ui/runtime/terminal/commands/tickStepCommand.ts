import { CommandDefinition } from "../../../../lib/terminal";
import { useTelemetryStore } from "../../state/useTelemetryStore";
import {
    tickStepSchema,
    buildInvalidArgsResult,
    TICK_KEY,
} from "../runtimeConstants";

export const tickStepCommand: CommandDefinition = {
    name: "tick.step",
    description: "Increment the runtime tick counter",
    usage: "tick.step",
    execute: (args, context) => {
        const parsed = tickStepSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("tick.step");

        const nextTick = context.runtime?.step?.() ?? null;
        if (nextTick === null) {
            return {
                type: "error",
                content: "Runtime not initialized. Run game.new first.",
            };
        }

        const { setSticky } = useTelemetryStore.getState();
        setSticky(TICK_KEY, nextTick);
        return { type: "success", content: `Tick advanced to ${nextTick}.` };
    },
    autocomplete: () => [],
};
