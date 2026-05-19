import type { CommandResult } from "../lib/terminal";
import { CommandRegistry, composeCommands } from "../lib/terminal";
import { STANDARD_COMMANDS } from "../engine/terminal/commands";
import { RUNTIME_COMMANDS } from "../ui/runtime/terminal/runtimeRegistry";
import { createShellCommandContext } from "./shellCommandContext";

export interface ShellCommandExecutor {
    execute: (command: string) => Promise<CommandResult>;
}

export const createShellCommandExecutor = (): ShellCommandExecutor => {
    const registry = new CommandRegistry(
        composeCommands(STANDARD_COMMANDS, RUNTIME_COMMANDS),
    );
    return {
        execute: (command) =>
            registry.execute(command, createShellCommandContext()),
    };
};
