import { RuntimeCommandType } from "../types";
import type { CommandHandlerContext } from "./types";

export const enqueuePendingBodyHabitiUpdate = (
    context: CommandHandlerContext,
    entityId: string,
    pendingHabiti: string[] | null,
) => {
    if (!pendingHabiti) return;
    if (!context.commands) {
        context.telemetry.log(
            "errors",
            `Spawn queued Habiti update failed: commands missing for '${entityId}'.`,
        );
        return;
    }
    context.commands.enqueue({
        type: RuntimeCommandType.UPDATE_BODIES_BATCH,
        payload: { updates: [{ entityId, habiti: pendingHabiti }] },
    });
};
