import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import { countExtantBodies } from "../assignment/extantBodyIds";

const isDormant = (snapshot: Snapshot): boolean => {
    const world = snapshot.getEntity("sys_world");
    const state = (world as { state?: Record<string, unknown> } | undefined)
        ?.state;
    return state?.dormant !== undefined;
};

export class CensusSystem implements System {
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const population = countExtantBodies(snapshot.getEntities() as any);
        const previousPopulation = snapshot.getGlobal("population");

        if (population !== previousPopulation) {
            commands.enqueue({
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "population",
                    value: population,
                    visible: true,
                },
            });
        }

        if (
            population === 0 &&
            previousPopulation > 0 &&
            !isDormant(snapshot)
        ) {
            commands.enqueue({
                type: RuntimeCommandType.GAME_DORMANCY,
                payload: { reason: "extinction" },
            });
        }
    }
}

