import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type {
    AcknowledgeTutorialModalGuidanceCommandPayload,
    SetTutorialStateCommandPayload,
} from "./runtimeCommandPayloads";

export type SetTutorialStateCommand = Command<
    RuntimeCommandType.SET_TUTORIAL_STATE,
    SetTutorialStateCommandPayload
>;

export type AcknowledgeTutorialModalGuidanceCommand = Command<
    RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE,
    AcknowledgeTutorialModalGuidanceCommandPayload
>;
