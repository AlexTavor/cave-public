import type {
    AwakenCaveCommandPayload,
    GameDormancyCommandPayload,
    KillAllBodiesExceptCommandPayload,
    SetTargetCommandPayload,
} from "./runtimeCommandPayloadsAbsorption";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type { Command } from "./runtimeCommandBase";
export type KillAllBodiesExceptCommand = Command<
    RuntimeCommandType.KILL_ALL_BODIES_EXCEPT,
    KillAllBodiesExceptCommandPayload
>;
export type SetTargetCommand = Command<
    RuntimeCommandType.SET_TARGET,
    SetTargetCommandPayload
>;
export type GameDormancyCommand = Command<
    RuntimeCommandType.GAME_DORMANCY,
    GameDormancyCommandPayload
>;
export type AwakenCaveCommand = Command<
    RuntimeCommandType.AWAKEN_CAVE,
    AwakenCaveCommandPayload
>;

