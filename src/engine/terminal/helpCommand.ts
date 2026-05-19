import { CommandDefinition } from "../../lib/terminal";

// --- Standard Bundle ---

export const helpCommand: CommandDefinition = {
    name: "help",
    description: "List all available commands.",
    usage: "help [command]",
    execute: async (args, ctx) => {
        if (args.length > 0) {
            const cmdName = args[0];
            const cmd = ctx.registry.getCommand(cmdName);
            if (!cmd) {
                return {
                    type: "error",
                    content: `Command '${cmdName}' not found.`,
                };
            }
            return {
                type: "info",
                content: `
Help: ${cmd.name}
${cmd.description}
Usage: ${cmd.usage}
`.trim(),
            };
        }

        const all = ctx.registry.getAllCommands();
        const list = all
            .map((c) => c.name)
            .sort((a, b) => a.localeCompare(b))
            .join(", ");
        return { type: "info", content: `Available commands: ${list}` };
    },
    autocomplete: (args, ctx) => {
        if (args.length === 1) {
            const token = args[0].toLowerCase();
            return ctx.registry
                .getAllCommands()
                .filter((c) => c.name.startsWith(token))
                .map((c) => ({
                    label: c.name,
                    type: "command",
                    description: c.description,
                    insertText: c.name,
                }));
        }
        return [];
    },
};
