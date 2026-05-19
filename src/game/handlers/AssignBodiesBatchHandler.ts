import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { findRuntimeEntity } from "./AssignBodiesBatchHandler.resolveUpdate";
import { applyAssignBodiesBatchUpdate } from "./AssignBodiesBatchHandler.applyUpdate";

export class AssignBodiesBatchHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.ASSIGN_BODIES_BATCH;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.ASSIGN_BODIES_BATCH) return;
        const world = findRuntimeEntity(context.world.entities, "sys_world");
        if (!world) {
            context.telemetry.log(
                "errors",
                "ASSIGN_BODIES_BATCH failed: missing sys_world.",
            );
            return;
        }
        for (const update of command.payload.updates) {
            applyAssignBodiesBatchUpdate(command, context, world, update);
        }
    }
}
