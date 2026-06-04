import { catCommand } from "./catCommand";
import { clearCommand } from "./clearCommand";
import { bootstrapLoadCommand } from "./commands/bootstrapLoadCommand";
import { fsCommands } from "./commands/fsCommands.ts";
import { makeCommands } from "./commands/makeCommands";
import { projectCommands } from "./commands/projectCommands";
import { vfsCommands } from "./commands/vfsCommands.ts";
import { vfsHardReloadCommand } from "./commands/vfsHardReloadCommand.ts";
import { helpCommand } from "./helpCommand";
import { lsCommand } from "./lsCommand";
import { rmCommand } from "./rmCommand";
import { saveCommand } from "./saveCommand";

// Export Bundles
export const STANDARD_COMMANDS = [
    helpCommand,
    clearCommand,
    bootstrapLoadCommand,
    ...fsCommands,
    ...vfsCommands,
    vfsHardReloadCommand,
    ...makeCommands,
    ...projectCommands,
    lsCommand,
    catCommand,
    rmCommand,
    saveCommand,
];

