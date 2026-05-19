import type {
    ClearDraftCommandPayload,
    ResolveDraftCommandPayload,
    TriggerDraftCommandPayload,
} from "./runtimeCommandPayloads";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type { Command } from "./runtimeCommandBase";

export type TriggerDraftCommand = Command<
    RuntimeCommandType.TRIGGER_DRAFT,
    TriggerDraftCommandPayload
>;

export type ResolveDraftCommand = Command<
    RuntimeCommandType.RESOLVE_DRAFT,
    ResolveDraftCommandPayload
>;

export type ClearDraftCommand = Command<
    RuntimeCommandType.CLEAR_DRAFT,
    ClearDraftCommandPayload
>;
