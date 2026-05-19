import type { AdjustStateCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const ensureStateEntry = (
    entity: RuntimeEntity,
    key: string,
    delta: number,
): void => {
    const state = (entity as { state?: Record<string, unknown> }).state;
    if (!state || typeof state !== "object") {
        // Can't adjust non-existent state with a delta reliably without a baseline
        return;
    }

    const entry = state[key] as
        | {
              value?: number;
              min?: number;
              max?: number;
          }
        | undefined;

    if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.value !== "number"
    ) {
        return;
    }

    let nextValue = entry.value + delta;

    if (typeof entry.min === "number") {
        nextValue = Math.max(entry.min, nextValue);
    } else if (typeof entry.max === "number") {
        nextValue = Math.max(0, nextValue);
    }
    if (typeof entry.max === "number") {
        nextValue = Math.min(entry.max, nextValue);
    }

    entry.value = nextValue;
};

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class AdjustStateHandler implements CommandHandler<AdjustStateCommand> {
    public readonly type = RuntimeCommandType.ADJUST_STATE;

    public handle(
        command: AdjustStateCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId, key, delta } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `ADJUST_STATE failed: entity '${entityId}' not found.`,
            );
            return;
        }

        ensureStateEntry(entity, key, delta);
    }
}
