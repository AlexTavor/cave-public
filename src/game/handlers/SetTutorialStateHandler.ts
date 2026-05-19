import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type SetTutorialStateCommand,
} from "../../engine/runtime/types";
import { findWorldEntity } from "./draftUtils";
import { setTutorialComponent } from "../tutorials/tutorialStateUtils";

export class SetTutorialStateHandler implements CommandHandler<SetTutorialStateCommand> {
    public readonly type = RuntimeCommandType.SET_TUTORIAL_STATE;

    public handle(
        command: SetTutorialStateCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) return;
        setTutorialComponent(world, command.payload.tutorial);
    }
}
