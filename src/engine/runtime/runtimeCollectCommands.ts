import type { Snapshot } from "./Snapshot";
import type { PhaseContext } from "./runtimePhaseTypes";
import { RuntimeCommandType, type RuntimeCommand } from "./types";
import { MAX_COMMANDS_PER_TICK } from "./runtimeConstants";
import { resolveContention } from "./contention/ContentionResolver";

const enqueueAll = (
    context: PhaseContext,
    commands: RuntimeCommand[],
): void => {
    for (const command of commands) context.commandsManager.enqueue(command);
};

export const enqueueCollectedCommands = (
    context: PhaseContext,
    commands: RuntimeCommand[],
    snapshot: Snapshot,
): void => {
    if (commands.length === 0) return;
    if (!commands.some((c) => c.type === RuntimeCommandType.TRANSFER_ASSETS)) {
        enqueueAll(context, commands);
        return;
    }
    const resolvedCommands = resolveContention(
        commands,
        snapshot,
        (targetId) => {
            const entity = snapshot.getEntity(targetId) as
                | { blueprintId?: string }
                | undefined;
            if (!entity?.blueprintId) return undefined;
            const blueprintRaw =
                context.commandContext.cartridge.blueprints[entity.blueprintId];
            const blueprint = blueprintRaw as
                | Record<string, unknown>
                | undefined;
            const settings =
                (blueprint?.settings as Record<string, unknown> | undefined) ??
                (blueprint?.components as Record<string, unknown> | undefined)
                    ?.settings;
            return (settings as Record<string, unknown> | undefined)
                ?.contention as
                | {
                      resource: string;
                      sortBy: string;
                      direction: "ASC" | "DESC";
                  }[]
                | undefined;
        },
    );

    if (resolvedCommands.length > MAX_COMMANDS_PER_TICK) {
        context.state.status = "fatal";
        throw new Error(
            `Command budget exceeded: ${resolvedCommands.length} > ${MAX_COMMANDS_PER_TICK}.`,
        );
    }
    enqueueAll(context, resolvedCommands);
};

