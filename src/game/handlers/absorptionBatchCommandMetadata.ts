import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import {
    patchCommandMetadataInPlace,
    type RuntimeCommand,
    type RuntimeKilledEntityPresentation,
} from "../../engine/runtime/types";
import { enqueueMirroredFactAdjust } from "../facts/factCommands";

export const applyAbsorptionBatchMetadata = (input: {
    command: RuntimeCommand;
    context: CommandHandlerContext;
    killedEntityIds: string[];
    killedEntityPresentations: RuntimeKilledEntityPresentation[];
    processed: number;
    newHabiti: string[];
    xpTotal: number;
    resourceTotals: Array<{ resource: string; amount: number }>;
}) => {
    const payload = input.command.payload as {
        killedEntityIds?: string[];
        processedCount?: number;
        newHabiti?: string[];
        xpTotal?: number;
        resourceTotals?: Array<{ resource: string; amount: number }>;
    };
    payload.killedEntityIds = input.killedEntityIds;
    payload.processedCount = input.processed;
    payload.newHabiti = input.newHabiti;
    payload.xpTotal = input.xpTotal;
    payload.resourceTotals = input.resourceTotals;
    patchCommandMetadataInPlace(input.command, {
        killedEntityPresentations: input.killedEntityPresentations,
    });
    input.newHabiti.forEach((id) => {
        if (!input.context.commands) return;
        enqueueMirroredFactAdjust(
            input.context.commands,
            "habitus_owned",
            id,
            1,
        );
    });
};
