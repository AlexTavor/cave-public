import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { readKnownHabiti } from "../habiti/knownHabiti";
import { resolveSingleAbsorptionOutcome } from "./resolveAbsorptionHabitiOutcome";

const absorbsHabiti = (node: RuntimeEntity) =>
    (node as { state?: Record<string, { value?: unknown }> }).state
        ?.processing_absorbs_habiti?.value === true;

const readBodyPosition = (
    context: CommandHandlerContext,
    body: RuntimeEntity,
) => {
    const liveBody = body.id ? context.impulseEngine.getBody(body.id) : null;
    if (liveBody) return { x: liveBody.x, y: liveBody.y };
    return {
        x: (body as { physics?: { x?: number } }).physics?.x ?? 0,
        y: (body as { physics?: { y?: number } }).physics?.y ?? 0,
    };
};

export const syncPendingHabiti = (
    context: CommandHandlerContext,
    world: RuntimeEntity,
    node: RuntimeEntity,
    body: RuntimeEntity,
) => {
    if (!absorbsHabiti(node) || !world.id) return;
    const outcome = resolveSingleAbsorptionOutcome({
        station: node,
        bodyEntity: body,
        knownHabiti: new Set(readKnownHabiti(world, context.world.entities)),
        bonuses: {
            absorptionXpConversionBonus: 0,
            resourceGainMultipliers: {},
        },
        habitusIndex: context.cartridge.config?.habiti,
        onUnknownHabitusId: (id) =>
            context.telemetry.log(
                "errors",
                `Unknown Habitus id '${id}' during processing.`,
            ),
    });
    if (outcome.newHabiti.length === 0) return;
    const position = readBodyPosition(context, body);
    outcome.newHabiti.forEach((habitusId) =>
        context.commands?.enqueue({
            type: RuntimeCommandType.SPAWN_CARRIER,
            payload: {
                ...position,
                tags: [
                    "carrier",
                    "carrier:habiti",
                    `carrier:habiti:${habitusId}`,
                ],
                commands: [
                    { type: "GAIN_HABITI", habitusId },
                    { type: "KILL", entityId: "self" },
                ],
            },
            metadata: { sourceEntityId: body.id, sourceLane: "behavior_rule" },
        }),
    );
};
