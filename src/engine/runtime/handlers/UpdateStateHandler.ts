import type { RuntimeEntity, UpdateStateCommand } from "../types";
import { RuntimeCommandType } from "../types";
import { applyMaxChange, clampNumeric } from "./stateEntryNumeric";
import type { CommandHandler, CommandHandlerContext } from "./types";
import {
    readExplicitVisible,
    resolveEntryVisible,
} from "./stateEntryVisibility";

type StateEntry = {
    value?: number | string | boolean;
    visible?: boolean;
    min?: number;
    max?: number;
    scaleOnMaxChange?: boolean;
    preserveValueOnMaxDecrease?: boolean;
};

const updateExistingEntry = (
    entry: StateEntry,
    value: number | string | boolean | undefined,
    visible: boolean | undefined,
    max: number | undefined,
): void => {
    const effectiveMax = typeof max === "number" ? max : entry.max;

    if (value !== undefined) {
        entry.value =
            typeof value === "number"
                ? clampNumeric(value, entry.min, effectiveMax)
                : value;
    }
    if (visible !== undefined) entry.visible = visible;
    if (typeof max === "number") applyMaxChange(entry, max);
};

const ensureStateEntry = (
    entity: RuntimeEntity,
    key: string,
    value: number | string | boolean | undefined,
    visible: boolean | undefined,
    max?: number,
): void => {
    const rec = entity as { state?: Record<string, unknown> };
    const explicitVisible = visible;

    if (!rec.state || typeof rec.state !== "object") {
        rec.state = {
            [key]: {
                value,
                max,
                visible: resolveEntryVisible(undefined, explicitVisible),
            },
        };
        return;
    }

    const entry = rec.state[key] as StateEntry | undefined;

    if (!entry || typeof entry !== "object") {
        rec.state[key] = {
            value,
            max,
            visible: resolveEntryVisible(undefined, explicitVisible),
        };
        return;
    }

    updateExistingEntry(entry, value, explicitVisible, max);
};

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export class UpdateStateHandler implements CommandHandler<UpdateStateCommand> {
    public readonly type = RuntimeCommandType.UPDATE_STATE;

    public handle(
        command: UpdateStateCommand,
        context: CommandHandlerContext,
    ): void {
        const { entityId, key, value, max } = command.payload;
        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `UPDATE_STATE failed: entity '${entityId}' not found.`,
            );
            return;
        }

        ensureStateEntry(
            entity,
            key,
            value,
            readExplicitVisible(command.payload),
            max,
        );
    }
}

