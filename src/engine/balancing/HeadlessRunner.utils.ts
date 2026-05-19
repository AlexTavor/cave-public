import type { ModuleCartridge } from "../../data/schemas/module";
import { deepClone } from "../../utils/objectUtils";
import type { Runtime } from "../runtime/Runtime";
import { RuntimeCommandType } from "../runtime/types";

export type InitialSpawnConfig = {
    blueprintId: string;
    count: number;
};

export type LoopResult = {
    history: Array<{
        tick: number;
        population: number;
        food: number;
        heat: number;
        comfort: number;
    }>;
    status: "completed" | "extinction";
};

const SNAPSHOT_INTERVAL = 60;
const YIELD_INTERVAL = 500;

const getWorldEntity = (runtime: Runtime) =>
    runtime.getWorld().entities.find((entity) => entity.id === "sys_world");

const readStateValue = (runtime: Runtime, key: string): number | null => {
    const world = getWorldEntity(runtime) as
        | { state?: Record<string, { value?: unknown }> }
        | undefined;
    const value = world?.state?.[key]?.value;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export const initializeWorldState = (
    runtime: Runtime,
    cartridge: ModuleCartridge,
) => {
    const worldBlueprint = cartridge.blueprints["sys_world"];
    if (!worldBlueprint?.components?.state) return;
    const worldEntity = getWorldEntity(runtime);
    if (!worldEntity) return;
    worldEntity.state = deepClone(worldBlueprint.components.state);
};

export const enqueueInitialSpawn = (
    runtime: Runtime,
    config: InitialSpawnConfig | undefined,
) => {
    if (!config || config.count <= 0) return;
    for (let i = 0; i < config.count; i += 1) {
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: config.blueprintId },
        });
    }
};

export const runSimulationLoop = async (
    runtime: Runtime,
    ticks: number,
): Promise<LoopResult> => {
    const history: LoopResult["history"] = [];
    let status: LoopResult["status"] = "completed";

    for (let i = 0; i < ticks; i += 1) {
        runtime.tick(20);

        const tick = runtime.getState().tick;
        const population = readStateValue(runtime, "population");
        const isExtinct = typeof population === "number" && population <= 0;

        if (tick % SNAPSHOT_INTERVAL === 0 || isExtinct) {
            history.push({
                tick,
                population: population ?? 0,
                food: readStateValue(runtime, "food") ?? 0,
                heat: readStateValue(runtime, "heat") ?? 0,
                comfort: readStateValue(runtime, "comfort") ?? 0,
            });
        }

        if (isExtinct && i > 10) {
            status = "extinction";
            break;
        }

        if (i > 0 && i % YIELD_INTERVAL === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    return { history, status };
};

