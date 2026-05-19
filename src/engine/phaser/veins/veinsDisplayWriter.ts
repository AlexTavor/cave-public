import type { Runtime } from "../../runtime/Runtime";
import type { VeinGraph } from "./types";
import type { VeinConfig } from "../../../data/schemas/assets";
import { buildDisplayEdges } from "./veinsDisplayBuilder";

const VEINS_ENTITY_ID = "veins_display";

export const writeVeinsDisplayData = (
    runtime: Runtime,
    graph: VeinGraph,
    config: VeinConfig,
): void => {
    let entity = runtime.getEntity(VEINS_ENTITY_ID);
    if (!entity) {
        runtime.addEntity({
            id: VEINS_ENTITY_ID,
            display: { display_key: VEINS_ENTITY_ID, label: "Veins" },
        });
        entity = runtime.getEntity(VEINS_ENTITY_ID);
    }
    if (!entity) return;
    entity.veinsDisplayData = {
        edges: buildDisplayEdges(graph, config),
        isSimulationRunning: runtime.getState().status === "running",
    };
};
