import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type { AdjustFactCommandPayload } from "./runtimeCommandPayloads";

export type AdjustFactCommand = Command<
    RuntimeCommandType.ADJUST_FACT,
    AdjustFactCommandPayload
>;
