import type { RuntimeEntity, UpdatePowerSinkCommand } from "../types";
import { RuntimeCommandType } from "../types";
import type { CommandHandler, CommandHandlerContext } from "./types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

const mergeAttributes = (
    current: { body: number; mind: number; social: number },
    update: { body?: number; mind?: number; social?: number } | undefined,
) => {
    if (!update) return current;
    return {
        body: update.body ?? current.body,
        mind: update.mind ?? current.mind,
        social: update.social ?? current.social,
    };
};

export class UpdatePowerSinkHandler implements CommandHandler<UpdatePowerSinkCommand> {
    public readonly type = RuntimeCommandType.UPDATE_POWER_SINK;

    public handle(
        command: UpdatePowerSinkCommand,
        context: CommandHandlerContext,
    ): void {
        const {
            entityId,
            throttle,
            efficiency,
            drawFraction,
            allocatedDraw,
            status,
            baseDemand,
            maxDemand,
        } = command.payload;

        const entity = findEntityById(context.world.entities, entityId);

        if (!entity) {
            context.telemetry.log(
                "errors",
                `UPDATE_POWER_SINK failed: entity '${entityId}' not found.`,
            );
            return;
        }

        const sink = (entity as { powerSink?: any }).powerSink;
        if (!sink) {
            context.telemetry.log(
                "errors",
                `UPDATE_POWER_SINK failed: entity '${entityId}' has no powerSink.`,
            );
            return;
        }

        // Merge updates
        const nextBaseDemand = baseDemand
            ? mergeAttributes(sink.baseDemand, baseDemand)
            : sink.baseDemand;

        const nextMaxDemand = maxDemand
            ? mergeAttributes(sink.maxDemand ?? sink.baseDemand, maxDemand)
            : sink.maxDemand;

        (entity as { powerSink: any }).powerSink = {
            ...sink,
            throttle: throttle ?? sink.throttle,
            efficiency: efficiency ?? sink.efficiency,
            drawFraction: drawFraction ?? sink.drawFraction,
            allocatedDraw: allocatedDraw
                ? mergeAttributes(
                      sink.allocatedDraw ?? { body: 0, mind: 0, social: 0 },
                      allocatedDraw,
                  )
                : sink.allocatedDraw,
            status: status ?? sink.status,
            baseDemand: nextBaseDemand,
            maxDemand: nextMaxDemand,
        };
    }
}
