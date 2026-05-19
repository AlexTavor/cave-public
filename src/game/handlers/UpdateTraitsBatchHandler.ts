import type { RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";

interface TraitInstance {
    id: string;
    remainingSeconds?: number;
    cycles?: Record<string, { accumulatorSeconds: number }>;
}

const normalize = (traits: TraitInstance[]): TraitInstance[] => {
    const seen = new Set<string>();
    const unique: TraitInstance[] = [];
    for (const t of traits) {
        if (!seen.has(t.id)) {
            seen.add(t.id);
            unique.push(t);
        }
    }
    return unique.sort((a, b) => a.id.localeCompare(b.id));
};

export class UpdateTraitsBatchHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.UPDATE_TRAITS_BATCH;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.UPDATE_TRAITS_BATCH) return;

        for (const update of command.payload.updates) {
            const entity = context.world.entities.find(
                (e) => e.id === update.entityId,
            );
            if (!entity) {
                context.telemetry.log(
                    "errors",
                    `UPDATE_TRAITS_BATCH: entity '${update.entityId}' not found.`,
                );
                continue;
            }
            (entity as { traits?: TraitInstance[] }).traits = normalize(
                update.traits,
            );
        }
    }
}
