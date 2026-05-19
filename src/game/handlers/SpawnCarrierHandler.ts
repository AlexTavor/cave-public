import type {
    CommandHandler,
    CommandHandlerContext,
} from "../../engine/runtime/handlers/types";
import { buildPhysicsBody } from "../../engine/runtime/handlers/spawnUtils";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { PhysicsComponentSchema } from "../../data/schemas/physics";
import { CarrierSettingsSchema } from "../../data/schemas/game/carrier";
import { CARRIER_ARRIVED_STATE_KEY } from "../carriers/carrier";
import type { SpawnCarrierCommand } from "../../engine/runtime/types/runtimeCommandCarrier";

const readPosition = (body?: { x?: unknown; y?: unknown }) =>
    typeof body?.x === "number" && typeof body?.y === "number"
        ? { x: body.x, y: body.y }
        : null;

export class SpawnCarrierHandler implements CommandHandler<SpawnCarrierCommand> {
    public readonly type = RuntimeCommandType.SPAWN_CARRIER;

    public handle(
        command: SpawnCarrierCommand,
        context: CommandHandlerContext,
    ) {
        const { id, x, y, arrived, tags, commands } = command.payload;
        if (!tags.length || !commands.length) {
            return context.telemetry.log(
                "errors",
                "SPAWN_CARRIER failed: tags and commands are required.",
            );
        }
        const position = this.resolvePosition(command, context, x, y);
        if (!position) {
            return context.telemetry.log(
                "errors",
                "SPAWN_CARRIER failed: no spawn position could be resolved.",
            );
        }
        const settings = CarrierSettingsSchema.parse(
            context.cartridge.config?.settings?.carrier ?? {},
        );
        const entityId = id ?? `carrier:${crypto.randomUUID()}`;
        const entity: RuntimeEntity = {
            id: entityId,
            tags: [...tags],
            display: {
                label: settings.displayId,
                display_key: settings.displayId,
            },
            physics: PhysicsComponentSchema.parse({
                ...position,
                mass: 1,
                drag: 0.1,
                isStatic: false,
                radius: settings.radius,
            }),
            carrier: { commands },
            state: {
                [CARRIER_ARRIVED_STATE_KEY]: {
                    value: arrived ? 1 : 0,
                    visible: false,
                },
            },
        };
        const existing = context.world.entities.find(
            (current) => current.id === entityId,
        );
        existing && context.world.remove(existing);
        existing && context.impulseEngine.removeBody(entityId);
        context.world.add(entity);
        context.impulseEngine.addBody(
            buildPhysicsBody(entityId, entity.physics as any),
        );
    }

    private resolvePosition(
        command: SpawnCarrierCommand,
        context: CommandHandlerContext,
        x?: number,
        y?: number,
    ) {
        if (typeof x === "number" && typeof y === "number") return { x, y };
        const sourceId = command.metadata?.sourceEntityId;
        const source = sourceId
            ? context.impulseEngine.getBody(sourceId)
            : undefined;
        return (
            readPosition(source) ??
            readPosition(context.impulseEngine.getBody("sys_world"))
        );
    }
}
