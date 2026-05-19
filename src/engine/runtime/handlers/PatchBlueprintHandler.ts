import type { PatchBlueprintCommand, RuntimeEntity } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const applyStatePatch = (
    entity: RuntimeEntity,
    incomingState: Record<string, unknown>,
): void => {
    if (!isRecord(entity.state)) {
        entity.state = {};
    }

    const state = entity.state as Record<string, unknown>;

    for (const [key, value] of Object.entries(incomingState)) {
        if (state[key] !== undefined) continue;
        state[key] = value;
    }
};

const applyComponentPatch = (
    entity: RuntimeEntity,
    components: Record<string, unknown>,
): void => {
    for (const [key, value] of Object.entries(components)) {
        if (key === "state" && isRecord(value)) {
            applyStatePatch(entity, value);
            continue;
        }

        if (key === "body" && isRecord(value)) {
            if (isRecord(entity.body)) {
                entity.body = { ...entity.body, ...value };
            } else {
                entity.body = { ...value };
            }
            continue;
        }

        entity[key] = value;
    }

    if (Object.hasOwn(components, "behavior")) {
        entity.behavior = components.behavior;
    }

    if (Object.hasOwn(components, "display")) {
        entity.display = components.display;
    }
};

export class PatchBlueprintHandler implements CommandHandler<PatchBlueprintCommand> {
    public readonly type = RuntimeCommandType.PATCH_BLUEPRINT;

    public handle(
        command: PatchBlueprintCommand,
        context: CommandHandlerContext,
    ): void {
        const { blueprintId, components } = command.payload;
        const blueprint = context.cartridge.blueprints[blueprintId];

        if (!blueprint) {
            context.telemetry.log(
                "errors",
                `Patch failed: blueprint '${blueprintId}' not found.`,
            );
            return;
        }

        const targetComponents = blueprint.components as Record<
            string,
            unknown
        >;

        for (const [key, value] of Object.entries(components)) {
            const currentComp = targetComponents[key];
            if (key === "body" && isRecord(value) && isRecord(currentComp)) {
                targetComponents[key] = { ...currentComp, ...value };
            } else {
                targetComponents[key] = value;
            }
        }

        const entities = context.world.entities.filter(
            (entity) => entity.blueprintId === blueprintId,
        );

        for (const entity of entities) {
            applyComponentPatch(entity, components);
        }
    }
}
