import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type ShowThoughtCommand,
} from "../../engine/runtime/types";
import { findWorldEntity, getDraftComponent } from "./draftUtils";
import {
    getThoughtComponent,
    setThoughtComponent,
} from "../thoughts/thoughtUtils";

export class ShowThoughtHandler implements CommandHandler<ShowThoughtCommand> {
    public readonly type = RuntimeCommandType.SHOW_THOUGHT;

    public handle(
        command: ShowThoughtCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) {
            context.telemetry.log(
                "errors",
                "SHOW_THOUGHT failed: sys_world missing.",
            );
            return;
        }
        if (
            getThoughtComponent(world)?.active ||
            getDraftComponent(world)?.active
        )
            return;
        setThoughtComponent(world, {
            _tag: "thought",
            active: true,
            ...command.payload,
        });
    }
}
