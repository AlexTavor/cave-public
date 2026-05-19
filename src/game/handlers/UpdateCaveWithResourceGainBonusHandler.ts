import { RuntimeCommandType } from "../../engine/runtime/types";
import type { UpdateCaveCommand } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { UpdateCaveHandler } from "../../engine/runtime/handlers/UpdateCaveHandler";
import { enqueueResourceGainBonusStateSync } from "../habiti/enqueueResourceGainBonusStateSync";

export class UpdateCaveWithResourceGainBonusHandler implements CommandHandler<UpdateCaveCommand> {
    public readonly type = RuntimeCommandType.UPDATE_CAVE;
    private readonly baseHandler = new UpdateCaveHandler();

    public handle(
        command: UpdateCaveCommand,
        context: CommandHandlerContext,
    ): void {
        this.baseHandler.handle(command, context);
        if (
            !Array.isArray(command.payload.ownedHabiti) &&
            !Array.isArray(command.payload.ownedUnderstanding)
        ) {
            return;
        }
        if (command.payload.entityId !== "sys_world") return;
        const world = context.world.entities.find(
            (entry) => entry.id === command.payload.entityId,
        );
        if (!world || !(world as { cave?: unknown }).cave) return;
        enqueueResourceGainBonusStateSync({
            commands: context.commands,
            world,
            habitusIndex: context.cartridge.config?.habiti ?? {},
            understandingIndex: context.cartridge.config?.understanding ?? {},
            onUnknownHabitusId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Habitus '${id}'.`,
                ),
            onUnknownUnderstandingId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Understanding '${id}'.`,
                ),
        });
    }
}
