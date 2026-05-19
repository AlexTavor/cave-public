import type {
    BodyUpdatePayload,
    RuntimeCommand,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import {
    applyAssignmentUpdate,
    applyPassportUpdate,
    mergeAttributes,
    type MutableBodyComponent,
} from "./updateBodyBatchHelpers";

const applyUpdate = (
    update: BodyUpdatePayload,
    context: CommandHandlerContext,
): void => {
    const entity = context.world.entities.find(
        (candidate) => candidate.id === update.entityId,
    );

    if (!entity) {
        context.telemetry.log(
            "errors",
            `UPDATE_BODIES_BATCH failed: entity '${update.entityId}' not found.`,
        );
        return;
    }

    const body = (entity as { body?: unknown }).body;
    if (!body || typeof body !== "object") {
        context.telemetry.log(
            "errors",
            `UPDATE_BODIES_BATCH skipped: entity '${update.entityId}' missing body component.`,
        );
        return;
    }

    const component = body as MutableBodyComponent;

    if (typeof update.xp === "number") {
        component.xp = update.xp;
    }

    if (typeof update.level === "number") {
        component.level = update.level;
    }

    if (update.baseAttributes) {
        component.baseAttributes ??= { body: 0, mind: 0, social: 0 };
        mergeAttributes(component.baseAttributes, update.baseAttributes);
    }

    if (update.attributes) {
        component.attributes ??= { body: 0, mind: 0, social: 0 };
        mergeAttributes(component.attributes, update.attributes);
    }

    if (update.habiti) {
        component.habiti = [...new Set(update.habiti)].sort((a, b) =>
            a.localeCompare(b),
        );
    }

    if (update.traits) {
        component.traits = [...update.traits];
    }

    if (typeof update.maxHealth === "number") {
        component.maxHealth = update.maxHealth;
    }

    if (typeof update.health === "number") {
        const max = component.maxHealth;
        component.health =
            typeof max === "number"
                ? Math.min(update.health, max)
                : update.health;
    }

    applyPassportUpdate(component, update);
    applyAssignmentUpdate(component, update);
};

export class UpdateBodiesBatchHandler implements CommandHandler<RuntimeCommand> {
    public readonly type = RuntimeCommandType.UPDATE_BODIES_BATCH;

    public handle(
        command: RuntimeCommand,
        context: CommandHandlerContext,
    ): void {
        if (command.type !== RuntimeCommandType.UPDATE_BODIES_BATCH) return;
        const batch = command;

        for (const update of batch.payload.updates) {
            applyUpdate(update, context);
        }
    }
}

