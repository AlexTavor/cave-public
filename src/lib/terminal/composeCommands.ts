import type { CommandDefinition } from "./types";

export const composeCommands = (
    ...commandGroups: ReadonlyArray<ReadonlyArray<CommandDefinition>>
): CommandDefinition[] => {
    const seen = new Set<string>();
    const commands: CommandDefinition[] = [];

    for (const group of commandGroups) {
        for (const command of group) {
            if (seen.has(command.name)) continue;
            seen.add(command.name);
            commands.push(command);
        }
    }

    return commands;
};
