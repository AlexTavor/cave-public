import type { Command } from "./runtimeCommandBase";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type {
    AcknowledgeNotificationAbilityGuidanceCommandPayload,
    ShowNotificationAbilityGuidanceCommandPayload,
} from "./runtimeCommandPayloads";

export type ShowNotificationAbilityGuidanceCommand = Command<
    RuntimeCommandType.SHOW_NOTIFICATION_ABILITY_GUIDANCE,
    ShowNotificationAbilityGuidanceCommandPayload
>;

export type AcknowledgeNotificationAbilityGuidanceCommand = Command<
    RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE,
    AcknowledgeNotificationAbilityGuidanceCommandPayload
>;
