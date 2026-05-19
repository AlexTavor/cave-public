import type { RuntimeEntity, SetGlobalCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";
import {
    readExplicitVisible,
    resolveEntryVisible,
} from "./stateEntryVisibility";

const ensureStateEntry = (
    entity: RuntimeEntity,
    key: string,
    value: number,
    visible: boolean | undefined,
): void => {
    const state = (entity as { state?: Record<string, unknown> }).state;
    if (!state || typeof state !== "object") {
        (entity as { state?: Record<string, unknown> }).state = {
            [key]: { value, visible: resolveEntryVisible(undefined, visible) },
        };
        return;
    }

    const entry = state[key] as
        | { value?: number; visible?: boolean }
        | undefined;
    if (!entry || typeof entry !== "object") {
        state[key] = {
            value,
            visible: resolveEntryVisible(undefined, visible),
        };
        return;
    }

    entry.value = value;
    entry.visible = resolveEntryVisible(entry, visible);
};

const findWorldEntity = (
    entities: RuntimeEntity[],
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === "sys_world");

export class SetGlobalHandler implements CommandHandler<SetGlobalCommand> {
    public readonly type = RuntimeCommandType.SET_GLOBAL;

    public handle(
        command: SetGlobalCommand,
        context: CommandHandlerContext,
    ): void {
        const worldEntity = findWorldEntity(context.world.entities);
        if (!worldEntity) {
            context.telemetry.log(
                "errors",
                "SET_GLOBAL failed: sys_world missing.",
            );
            return;
        }

        ensureStateEntry(
            worldEntity,
            command.payload.key,
            command.payload.value,
            readExplicitVisible(command.payload),
        );
    }
}

