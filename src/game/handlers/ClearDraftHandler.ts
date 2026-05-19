import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { clearDraftComponent, findWorldEntity } from "./draftUtils";

export class ClearDraftHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.CLEAR_DRAFT;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.CLEAR_DRAFT) return;
        const worldEntity = findWorldEntity(context.world.entities);
        if (!worldEntity) {
            context.telemetry.log(
                "errors",
                "CLEAR_DRAFT failed: sys_world missing.",
            );
            return;
        }

        clearDraftComponent(worldEntity);
    }
}
