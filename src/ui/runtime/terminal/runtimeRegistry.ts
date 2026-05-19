import { CommandDefinition, CommandRegistry } from "../../../lib/terminal";
import { tickStepCommand } from "./commands/tickStepCommand";
import { tickRunCommand } from "./commands/tickRunCommand";
import { tickStopCommand } from "./commands/tickStopCommand";
import { logTestCommand } from "./commands/logTestCommand";
import { runtimeReloadCommand } from "./commands/runtimeReloadCommand";
import { gameSpawnCommand } from "./commands/gameSpawnCommand";
import { gameResetCommand } from "./commands/gameResetCommand";
import { gameKillCommand } from "./commands/gameKillCommand.ts";
import { gameKillAllBodiesExceptCommand } from "./commands/gameKillAllBodiesExceptCommand";
import { gameEntitiesCommand } from "./commands/gameEntitiesCommand.ts";
import { gamePositionCommand } from "./commands/gamePositionCommand";
import { runCommand } from "./commands/runCommand";
import { repeatCommand } from "./commands/repeatCommand";
import { debugPhysicsCommand } from "./commands/debugPhysicsCommand";
import { balancingScanCommand } from "./commands/balancingScanCommand";
import { loadCommand } from "./commands/loadCommand";
import { gameSaveCommand } from "./commands/gameSaveCommand";
import { gameLoadCommand } from "./commands/gameLoadCommand";
import {
    transferCancelCommand,
    transferStartCommand,
} from "./commands/transferCommands";
import { setTargetCommand } from "./commands/targetCommands.ts";
import { gameDormancyCommand } from "./commands/gameDormancyCommand";
import { gameRebirthCommand } from "./commands/gameRebirthCommand";
import { tutorialModeCommand } from "./commands/tutorialModeCommand";
import { projectCommands } from "../../../engine/terminal/commands/projectCommands.ts";
export {
    AUTOMATIONS_KEY,
    AUTOMATION_COMMAND_KEY,
    NEXT_AUTOMATION_KEY,
    RUNTIME_KEY,
    STATUS_KEY,
    TICK_KEY,
    buildInvalidArgsResult,
    gameEntitiesSchema,
    gameKillSchema,
    gameKillAllBodiesExceptSchema,
    gamePositionSchema,
    gameSpawnSchema,
    gameAbsorbSchema,
    logTestSchema,
    repeatSchema,
    runSchema,
    runtimeReloadSchema,
    tickRunSchema,
    tickStepSchema,
    tickStopSchema,
    transferCancelSchema,
    transferStartSchema,
    balancingScanSchema,
    loadSchema,
    gameRebirthSchema,
    tutorialModeSchema,
    setTargetSchema,
} from "./runtimeConstants";
export const RUNTIME_COMMANDS: CommandDefinition[] = [
    repeatCommand,
    gameSpawnCommand,
    gameResetCommand,
    gameKillCommand,
    gameKillAllBodiesExceptCommand,
    gameEntitiesCommand,
    gamePositionCommand,
    gameDormancyCommand,
    gameRebirthCommand,
    tutorialModeCommand,
    runCommand,
    loadCommand,
    gameSaveCommand,
    gameLoadCommand,
    transferStartCommand,
    transferCancelCommand,
    setTargetCommand,
    tickStepCommand,
    tickRunCommand,
    tickStopCommand,
    logTestCommand,
    runtimeReloadCommand,
    debugPhysicsCommand,
    balancingScanCommand,
    ...projectCommands,
];

export const createRuntimeRegistry = () =>
    new CommandRegistry(RUNTIME_COMMANDS);

