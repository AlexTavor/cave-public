import type { Command } from "./runtimeCommandGeneric";
import { RuntimeCommandType } from "./runtimeCommandTypes";

export interface ShowCinematicCommandPayload {
  lines: string[];
}

export type ShowCinematicCommand = Command<
  RuntimeCommandType.SHOW_CINEMATIC,
  ShowCinematicCommandPayload
>;
