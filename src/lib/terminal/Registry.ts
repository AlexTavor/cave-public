import {
    CommandDefinition,
    CommandResult,
    Suggestion,
    ICommandRegistry,
    ExecutionContextInput,
} from "./types";
import { getAutocompleteContext } from "./registryAutocomplete";

export class CommandRegistry implements ICommandRegistry {
    private readonly commands = new Map<string, CommandDefinition>();

    private normalizeAlias(name: string): string {
        if (name === "vfs.makefile") return "makefile";
        if (name === "vfs.makedir") return "makedir";
        if (name.startsWith("fs.")) return `fs-${name.slice(3)}`;
        if (name.startsWith("vfs.")) return `vfs-${name.slice(4)}`;
        return name;
    }

    private getDisplayName(name: string): string {
        if (name.startsWith("fs-")) return `fs.${name.slice(3)}`;
        if (name.startsWith("vfs-")) return `vfs.${name.slice(4)}`;
        if (name === "makefile") return "vfs.makeFile";
        if (name === "makedir") return "vfs.makeDir";
        return name;
    }

    constructor(initialCommands: CommandDefinition[] = []) {
        initialCommands.forEach((cmd) => this.register(cmd));
    }

    register(command: CommandDefinition) {
        if (this.commands.has(command.name)) {
            console.warn(`[Terminal] Overwriting command: ${command.name}`);
        }
        this.commands.set(command.name, command);
    }

    unregister(name: string) {
        this.commands.delete(name);
    }

    getCommand(name: string): CommandDefinition | undefined {
        return this.commands.get(this.normalizeAlias(name.toLowerCase()));
    }

    getAllCommands(): CommandDefinition[] {
        return Array.from(this.commands.values());
    }

    async execute(
        input: string,
        context: ExecutionContextInput = {},
    ): Promise<CommandResult> {
        const parts = input.trim().split(/\s+/);
        const cmdName = parts[0].toLowerCase();
        const normalizedName = this.normalizeAlias(cmdName);
        const args = parts.slice(1);

        if (!cmdName) {
            return { type: "error", content: "Empty command" };
        }

        const command = this.commands.get(normalizedName);

        if (!command) {
            return {
                type: "error",
                content: `Unknown command: '${cmdName}'. Type 'help' for a list of commands.`,
            };
        }

        try {
            return await command.execute(args, { registry: this, ...context });
        } catch (error: unknown) {
            return {
                type: "error",
                content: `Execution failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            };
        }
    }

    getSuggestions(
        input: string,
        context: ExecutionContextInput = {},
    ): Suggestion[] {
        const cursorPosition = (context as { cursorPosition?: number })
            .cursorPosition;
        const autocomplete = getAutocompleteContext(input, cursorPosition);
        if (!autocomplete) return [];
        const { parts, isTypingCommand } = autocomplete;
        if (isTypingCommand) {
            const token = parts[0].toLowerCase();
            return Array.from(this.commands.values())
                .filter((cmd) => {
                    const alias = this.getDisplayName(cmd.name);
                    return (
                        cmd.name.startsWith(token) || alias.startsWith(token)
                    );
                })
                .map((cmd) => ({
                    label: this.getDisplayName(cmd.name),
                    type: "command",
                    description: cmd.description,
                    insertText: this.getDisplayName(cmd.name) + " ",
                }));
        }
        const cmdName = this.normalizeAlias(parts[0].toLowerCase());
        const command = this.commands.get(cmdName);
        if (command?.autocomplete) {
            const args = parts.slice(1);
            return (
                command.autocomplete(args, { registry: this, ...context }) || []
            );
        }
        return [];
    }
}

