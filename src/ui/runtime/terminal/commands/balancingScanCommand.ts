import { CommandDefinition } from "../../../../lib/terminal";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { Scanner } from "../../../../engine/balancing/Scanner";
import {
    balancingScanSchema,
    buildInvalidArgsResult,
} from "../runtimeConstants";
import { getFileSuggestions } from "../../../../engine/terminal/fileUtils";

export const balancingScanCommand: CommandDefinition = {
    name: "balancing.scan",
    description: "Analyze a cartridge for tunable levers.",
    usage: "balancing.scan <filename>",
    execute: async (args) => {
        if (!args[0]) {
            return { type: "error", content: "Filename required." };
        }

        const parsed = balancingScanSchema.safeParse(args);
        if (!parsed.success) return buildInvalidArgsResult("balancing.scan");

        const filename = args[0];
        const cartridge = await vfs.readFile(filename);
        if (!cartridge) return { type: "error", content: "File not found." };

        const scanner = new Scanner();
        const levers = scanner.scan(cartridge);

        const stats = { setting: 0, state: 0, behavior: 0 };
        levers.forEach((lever) => {
            stats[lever.type] += 1;
        });

        return {
            type: "success",
            content: [
                `Scan Results for '${filename}':`,
                `- Global Settings: ${stats.setting}`,
                `- State Defaults: ${stats.state}`,
                `- Behavior Rules: ${stats.behavior}`,
                `Total Levers: ${levers.length}`,
            ].join("\n"),
        };
    },
    autocomplete: getFileSuggestions,
};
