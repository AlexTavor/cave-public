import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type {
    AcknowledgeHabitiAnnouncementCommandPayload,
    GainHabitiCommandPayload,
} from "./runtimeCommandPayloads";

export type AcknowledgeHabitiAnnouncementCommand = Command<
    RuntimeCommandType.ACKNOWLEDGE_HABITI_ANNOUNCEMENT,
    AcknowledgeHabitiAnnouncementCommandPayload
>;

export type GainHabitiCommand = Command<
    RuntimeCommandType.GAIN_HABITI,
    GainHabitiCommandPayload
>;
