import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type ClearThoughtCommand,
} from "../../engine/runtime/types";
import { findWorldEntity } from "./draftUtils";
import { clearThoughtComponent } from "../thoughts/thoughtUtils";

export class ClearThoughtHandler implements CommandHandler<ClearThoughtCommand> {
    public readonly type = RuntimeCommandType.CLEAR_THOUGHT;

    public handle(
        _command: ClearThoughtCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) {
            context.telemetry.log(
                "errors",
                "CLEAR_THOUGHT failed: sys_world missing.",
            );
            return;
        }
        clearThoughtComponent(world);
    }
}
