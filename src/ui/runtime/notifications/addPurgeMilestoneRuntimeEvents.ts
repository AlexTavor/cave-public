import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";
import { readCommandPurgeMilestoneMessage } from "../../../engine/runtime/commandMetadata";
import type { RuntimeEventInput } from "./runtimeNotificationTypes";
import { pushRuntimeEventCount } from "./resolveRuntimeNotificationEventAccumulator";

const readMilestoneId = (key: string) =>
    key.startsWith("purge_milestone_")
        ? key.slice("purge_milestone_".length)
        : "";

export const addPurgeMilestoneRuntimeEvents = (
    items: Map<string, RuntimeEventInput>,
    commands: RuntimeCommand[],
): void => {
    for (const command of commands) {
        if (command.type !== RuntimeCommandType.UPDATE_STATE) continue;
        if (command.payload.entityId !== "sys_world") continue;
        const milestoneId = readMilestoneId(command.payload.key);
        if (!milestoneId) continue;
        pushRuntimeEventCount(items, {
            kind: "purge_milestone",
            aggregationKey: `purge_milestone:${milestoneId}`,
            count: 1,
            entityLabel: readCommandPurgeMilestoneMessage(command),
        });
    }
};
