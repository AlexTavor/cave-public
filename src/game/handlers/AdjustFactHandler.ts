import {
    RuntimeCommandType,
    type AdjustFactCommand,
} from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { findWorldEntity } from "./draftUtils";
import { adjustFact } from "../facts/factUtils";

export class AdjustFactHandler implements CommandHandler<AdjustFactCommand> {
    public readonly type = RuntimeCommandType.ADJUST_FACT;

    public handle(
        command: AdjustFactCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) {
            context.telemetry.log(
                "errors",
                "ADJUST_FACT failed: sys_world missing.",
            );
            return;
        }
        adjustFact(
            world,
            command.payload.scope,
            command.payload.factType,
            command.payload.factAbout,
            command.payload.delta,
        );
    }
}
