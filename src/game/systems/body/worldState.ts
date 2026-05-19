import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type { AttributeTotals } from "./attributes";
import { toAttributeTotals } from "./attributes";
import type { HabitusDefinition } from "../../../data/schemas/game/habiti";
import type { UnderstandingDefinition } from "../../../data/schemas/game/understanding";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type {
    CommandBuffer,
    RuntimeCommand,
} from "../../../engine/runtime/types";
import { resolveEffectiveCaveAttributes } from "../../habiti/resolveEffectiveCaveAttributes";
import { readWorldSeed } from "../../../utils/worldSeed";

export const readBodySystemWorldState = (snapshot: Snapshot) => {
    const world = snapshot.getEntity("sys_world") as
        | {
              state?: Record<string, { value?: number }>;
              cave?: {
                  attributes?: AttributeTotals;
                  ownedHabiti?: string[];
                  ownedUnderstanding?: string[];
              };
              body?: { attributes?: AttributeTotals };
          }
        | undefined;
    const comfort = world?.state?.comfort?.value;
    const bodySerial = world?.state?.bodySerial?.value;
    return {
        bodySerial:
            typeof bodySerial === "number" && Number.isFinite(bodySerial)
                ? Math.max(0, Math.floor(bodySerial))
                : 0,
        comfortMultiplier:
            typeof comfort === "number" && Number.isFinite(comfort)
                ? Math.max(0, Math.min(1, comfort))
                : 1,
        worldSeed: readWorldSeed(world, "world"),
        caveAttributes: toAttributeTotals(
            world?.cave?.attributes ?? world?.body?.attributes,
            0,
        ),
        ownedHabiti: world?.cave?.ownedHabiti ?? [],
        ownedUnderstanding: world?.cave?.ownedUnderstanding ?? [],
    };
};

export const resolveBodySystemCaveAttributes = (
    snapshot: Snapshot,
    habitusIndex: Record<string, HabitusDefinition>,
    understandingIndex: Record<string, UnderstandingDefinition> = {},
) => {
    const worldState = readBodySystemWorldState(snapshot);
    return resolveEffectiveCaveAttributes({
        baseAttributes: worldState.caveAttributes,
        ownedHabiti: worldState.ownedHabiti,
        habitusIndex,
        ownedUnderstanding: worldState.ownedUnderstanding,
        understandingIndex,
    });
};

export const enqueueBodySerialUpdate = (
    commands: CommandBuffer<RuntimeCommand>,
    bodySerial: number,
): void => {
    commands.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId: "sys_world",
            key: "bodySerial",
            value: bodySerial,
            visible: false,
        },
    });
};
