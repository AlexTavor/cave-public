import type { UpdateAutomationCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import { AutomationComponentSchema } from "../../../data/schemas/components";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class UpdateAutomationHandler implements CommandHandler<UpdateAutomationCommand> {
    public readonly type = RuntimeCommandType.UPDATE_AUTOMATION;

    public handle(
        command: UpdateAutomationCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId, remainingMs, repeats } = command.payload;
        const target = findEntityById(context.world.entities, entityId);

        if (!target) {
            context.telemetry.log(
                "errors",
                `Automation update failed: '${entityId}' not found.`,
            );
            return;
        }

        const automation = target.automation;
        const parsed = AutomationComponentSchema.safeParse(automation);
        if (!parsed.success) {
            context.telemetry.log(
                "errors",
                `Automation update failed: '${entityId}' missing automation data.`,
            );
            return;
        }

        (
            target as RuntimeEntity & { automation: typeof parsed.data }
        ).automation = {
            ...parsed.data,
            remainingMs,
            repeats,
        };
    }
}
