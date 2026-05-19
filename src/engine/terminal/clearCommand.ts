import { CommandDefinition } from "../../lib/terminal";

export const clearCommand: CommandDefinition = {
    name: "clear",
    description: "Clear the terminal logs.",
    usage: "clear",
    execute: (_, ctx) => {
        ctx.terminal?.clearLogs();
        return { type: "success", content: "Terminal cleared." };
    },
};
