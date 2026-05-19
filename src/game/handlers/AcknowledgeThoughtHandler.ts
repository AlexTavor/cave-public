import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type AcknowledgeThoughtCommand,
} from "../../engine/runtime/types";
import { findWorldEntity } from "./draftUtils";
import { adjustFact } from "../facts/factUtils";
import {
    clearThoughtComponent,
    getThoughtComponent,
} from "../thoughts/thoughtUtils";

export class AcknowledgeThoughtHandler implements CommandHandler<AcknowledgeThoughtCommand> {
    public readonly type = RuntimeCommandType.ACKNOWLEDGE_THOUGHT;

    public handle(
        command: AcknowledgeThoughtCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        const thought = world ? getThoughtComponent(world) : null;
        if (
            !world ||
            !thought?.active ||
            thought.thoughtId !== command.payload.thoughtId
        )
            return;
        if (thought.rememberScope) {
            adjustFact(
                world,
                thought.rememberScope,
                "thought_seen",
                thought.thoughtId,
                1,
            );
        }
        clearThoughtComponent(world);
    }
}
