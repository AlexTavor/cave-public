import type { SpawnAutomationCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import { mintSpawnId } from "./mintSpawnId";
import {
    AutomationComponentSchema,
    type AutomationComponent,
} from "../../../data/schemas/components";

export class AutomationSpawnHandler implements CommandHandler<SpawnAutomationCommand> {
    public readonly type = RuntimeCommandType.SPAWN_AUTOMATION;

    public handle(
        command: SpawnAutomationCommand,
        context: CommandHandlerContext,
    ): void {
        const {
            command: rawCommand,
            intervalMs,
            repeats,
            label,
        } = command.payload;

        if (!rawCommand?.trim()) {
            context.telemetry.log(
                "errors",
                "Automation spawn failed: command string is empty.",
            );
            return;
        }

        if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
            context.telemetry.log(
                "errors",
                "Automation spawn failed: interval must be > 0.",
            );
            return;
        }

        if (!Number.isFinite(repeats)) {
            context.telemetry.log(
                "errors",
                "Automation spawn failed: repeats must be a number.",
            );
            return;
        }

        const automation: AutomationComponent = {
            type: "interval",
            command: rawCommand,
            intervalMs,
            remainingMs: intervalMs,
            repeats,
            label,
        };

        const parsed = AutomationComponentSchema.safeParse(automation);
        if (!parsed.success) {
            context.telemetry.log(
                "errors",
                "Automation spawn failed: invalid automation payload.",
            );
            return;
        }

        const entityId = mintSpawnId(context.world);

        const entity: RuntimeEntity = {
            id: entityId,
            label: label ?? "Automation",
            automation,
            tags: ["automation"],
        };

        context.world.add(entity);
        context.telemetry.log(
            "systems",
            `Automation '${entityId}' scheduled every ${intervalMs}ms (${repeats}).`,
        );
    }
}
