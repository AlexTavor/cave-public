import type { ModuleCartridge } from "../../data/schemas/module";
import type { Runtime } from "../runtime/Runtime";
import type { CommandHandler } from "../runtime/handlers/types";
import type { RuntimeCommand } from "../runtime/types";
import { InstantTransferHandler } from "./InstantTransferHandler";
import {
    enqueueInitialSpawn,
    initializeWorldState,
    runSimulationLoop,
    type InitialSpawnConfig,
} from "./HeadlessRunner.utils";

export interface SimulationConfig {
    ticks: number;
    seed: string;
    cartridge: ModuleCartridge;
    initialSpawn?: InitialSpawnConfig;
    runtimeFactory: (cartridge: ModuleCartridge, seed: string) => Runtime;
}

export interface SimulationStep {
    tick: number;
    population: number;
    food: number;
    heat: number;
    comfort: number;
}

export interface SimulationResult {
    history: SimulationStep[];
    status: "completed" | "extinction";
    durationMs: number;
}

const getNow = (): number => {
    if (typeof performance === "undefined") return Date.now();
    return performance.now();
};

export class HeadlessRunner {
    public async run(config: SimulationConfig): Promise<SimulationResult> {
        const start = getNow();
        const runtime = config.runtimeFactory(config.cartridge, config.seed);
        const instantHandler =
            new InstantTransferHandler() as unknown as CommandHandler<RuntimeCommand>;
        runtime.registerCommandHandler(instantHandler);
        initializeWorldState(runtime, config.cartridge);
        enqueueInitialSpawn(runtime, config.initialSpawn);

        const loop = await runSimulationLoop(runtime, config.ticks);
        const history: SimulationStep[] = loop.history;

        return {
            history,
            status: loop.status,
            durationMs: getNow() - start,
        };
    }
}

