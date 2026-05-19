import type { Snapshot } from "../../../engine/runtime/Snapshot";
import { getFactValue } from "../../facts/factUtils";
import { countPopulationBodies } from "../populationCount";

const FACT_ABOUT = "world";

export const resolveActiveBodiesFactDelta = (snapshot: Snapshot): number => {
    const world = snapshot.getEntity("sys_world");
    if (!world) return 0;
    const current = countPopulationBodies(snapshot);
    const previous = getFactValue(world, "run", "active_bodies", FACT_ABOUT);
    return current - previous;
};

export const ACTIVE_BODIES_FACT_ABOUT = FACT_ABOUT;
