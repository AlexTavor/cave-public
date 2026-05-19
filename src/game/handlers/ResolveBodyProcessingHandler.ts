import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { handleResolvedBodyProcessing } from "./resolveBodyProcessingCommand";

export class ResolveBodyProcessingHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.RESOLVE_BODY_PROCESSING;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.RESOLVE_BODY_PROCESSING) return;
        handleResolvedBodyProcessing(command, context);
    }
}
