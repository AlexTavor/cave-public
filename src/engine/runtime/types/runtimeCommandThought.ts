import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type {
    AcknowledgeThoughtCommandPayload,
    ClearThoughtCommandPayload,
    ShowThoughtCommandPayload,
} from "./runtimeCommandPayloads";

export type ShowThoughtCommand = Command<
    RuntimeCommandType.SHOW_THOUGHT,
    ShowThoughtCommandPayload
>;
export type AcknowledgeThoughtCommand = Command<
    RuntimeCommandType.ACKNOWLEDGE_THOUGHT,
    AcknowledgeThoughtCommandPayload
>;
export type ClearThoughtCommand = Command<
    RuntimeCommandType.CLEAR_THOUGHT,
    ClearThoughtCommandPayload
>;
