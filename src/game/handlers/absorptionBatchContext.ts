import type { RuntimeEntity } from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";

const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export const resolveAbsorptionBatchContext = (
    context: CommandHandlerContext,
    stationId: string,
) => {
    const station = findEntityById(context.world.entities, stationId);
    if (!station) {
        context.telemetry.log(
            "errors",
            `ABSORB_BATCH failed: station '${stationId}' not found.`,
        );
        return null;
    }
    const world = findEntityById(context.world.entities, "sys_world");
    if (!world) {
        context.telemetry.log(
            "errors",
            "ABSORB_BATCH failed: missing sys_world.",
        );
        return null;
    }
    const caveWorld = world as RuntimeEntity & {
        cave?: { ownedHabiti?: string[] };
    };
    if (!caveWorld.cave) {
        context.telemetry.log("errors", "ABSORB_BATCH failed: missing Cave.");
        return null;
    }
    return { station, world, caveWorld };
};
