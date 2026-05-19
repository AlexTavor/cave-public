import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    RuntimeCommandType,
    type AcknowledgeTutorialModalGuidanceCommand,
} from "../../engine/runtime/types";
import {
    getTutorialComponent,
    setTutorialComponent,
} from "../tutorials/tutorialStateUtils";
import { findWorldEntity } from "./draftUtils";

export class AcknowledgeTutorialModalGuidanceHandler implements CommandHandler<AcknowledgeTutorialModalGuidanceCommand> {
    public readonly type =
        RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE;

    public handle(
        command: AcknowledgeTutorialModalGuidanceCommand,
        context: CommandHandlerContext,
    ): void {
        const world = findWorldEntity(context.world.entities);
        if (!world) return;
        const tutorial = getTutorialComponent(world);
        if (!tutorial.active) return;
        const binding = tutorial.bindings.find(
            (item) => item.bindingId === command.payload.bindingId,
        );
        if (!binding) return;
        const guidance = context.cartridge.config?.settings?.guidances?.find(
            (item) => item.id === binding.guidanceId,
        );
        if (guidance?.presentation !== "modal") return;
        setTutorialComponent(world, {
            ...tutorial,
            acknowledgedModalBindingId: binding.bindingId,
        });
    }
}
