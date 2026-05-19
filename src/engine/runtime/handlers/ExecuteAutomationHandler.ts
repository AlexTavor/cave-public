import type { ExecuteAutomationCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

export class ExecuteAutomationHandler implements CommandHandler<ExecuteAutomationCommand> {
    public readonly type = RuntimeCommandType.EXECUTE_AUTOMATION;

    public handle(
        command: ExecuteAutomationCommand,
        context: CommandHandlerContext,
    ): void {
        const rawCommand = command.payload.command;
        if (!rawCommand?.trim()) {
            context.telemetry.log(
                "errors",
                "Automation execute skipped: empty command.",
            );
            return;
        }

        if (!context.executeCommand) {
            context.telemetry.log(
                "errors",
                `Automation execute failed: no command executor for '${rawCommand}'.`,
            );
            return;
        }

        context.executeCommand(rawCommand);
        context.telemetry.log("systems", `Automation executed: ${rawCommand}`);
    }
}
