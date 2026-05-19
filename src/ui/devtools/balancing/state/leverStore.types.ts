import type { LeverDefinition } from "../../../../engine/balancing/Scanner";
import type { SimulationResult } from "../../../../engine/balancing/HeadlessRunner";
import type { ModuleCartridge } from "../../../../data/schemas/module";

export interface SimulationRunConfig {
    scriptId: string;
    durationSeconds: number;
}

export interface LeverStoreState {
    levers: LeverDefinition[];
    overrides: Record<string, number>;
    promotions: Record<string, string>;
    simulationResult: SimulationResult | null;
    isRunning: boolean;
    simulationConfig: SimulationRunConfig;
}

export interface LeverStoreActions {
    scan: (cartridge: ModuleCartridge) => void;
    setOverride: (id: string, value: number | null) => void;
    promoteLever: (id: string) => void;
    setSimulationResult: (result: SimulationResult | null) => void;
    setIsRunning: (isRunning: boolean) => void;
    setSimulationConfig: (config: Partial<SimulationRunConfig>) => void;
    commit: (filename: string) => void;
}
