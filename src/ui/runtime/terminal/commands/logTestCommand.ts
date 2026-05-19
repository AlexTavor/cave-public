import { CommandDefinition } from "../../../../lib/terminal";
import { useTelemetryStore } from "../../state/useTelemetryStore";
import { logTestSchema, buildInvalidArgsResult } from "../runtimeConstants";

export const logTestCommand: CommandDefinition = {
    name: "log.test",
    description: "Emit a test log entry to the tick stream",
    usage: "log.test <message>",
    execute: (args) => {
        const parsed = logTestSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("log.test");

        const message = args.join(" ");
        useTelemetryStore.getState().log("tick", message, "info");
        return { type: "success", content: "Logged test message." };
    },
    autocomplete: (args) => {
        if (args.length === 0 || (args.length === 1 && !args[0])) {
            return [
                {
                    label: "Hello World",
                    type: "value" as const,
                    insertText: "Hello World",
                    description: "Example message",
                },
            ];
        }
        return [];
    },
};
