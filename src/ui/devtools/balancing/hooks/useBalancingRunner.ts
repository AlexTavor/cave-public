import { useCallback } from "react";
import { HeadlessRunner } from "../../../../engine/balancing/HeadlessRunner";
import { useModuleStore } from "../../state/moduleStore";
import { useShellStore } from "../../shell/shell";
import { useLeverStore } from "../state/useLeverStore";
import { patchCartridge } from "../utils/cartridgePatcher";
import { createGame } from "../../../../game/main";
import { vfs } from "../../../../engine/vfs/FileSystem";
import { createRuntimeRegistry } from "../../../runtime/terminal/runtimeRegistry";
import type { ExecutionContextInput } from "../../../../lib/terminal";
import { Runtime } from "../../../../engine/runtime/Runtime";
import { ModuleCartridge } from "../../../../data/schemas/module";

const secondsToTicks = (seconds: number): number => {
    if (!Number.isFinite(seconds) || seconds <= 0) return 1;
    return Math.max(1, Math.ceil((seconds * 1000) / 16));
};

function createExecutionContext(
    runtime: Runtime,
    c: ModuleCartridge,
): ExecutionContextInput {
    return {
        runtime: {
            getRuntime: () => runtime,
            getActiveEntityIds: () =>
                runtime
                    .getEntities()
                    .map((e) => e.id!)
                    .filter(Boolean),
            getLoadedBlueprintIds: () => Object.keys(c.blueprints),
            // Stubs for unused/unsafe methods in headless context
            loadCartridge: () => {},
            play: () => {},
            pause: () => {},
            step: () => null,
        },
    };
}

const parseSimulationScript = (scriptContent: string): string[] =>
    scriptContent
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .filter((l) => !l.startsWith("game.new")) // HeadlessRunner handles loading
        .filter((l) => !l.startsWith("tick.run")) // HeadlessRunner drives the loop
        .filter((l) => !l.startsWith("rm ")) // No VFS side-effects
        .filter((l) => !l.startsWith("open ")); // No UI side-effects

const buildRuntimeFactory =
    (lines: string[]) =>
    (c: ModuleCartridge, s: string): Runtime => {
        const runtime = createGame(c, s);
        const registry = createRuntimeRegistry();
        const context: ExecutionContextInput = createExecutionContext(runtime, c);
        for (const line of lines) {
            void registry.execute(line, context);
        }
        return runtime;
    };

export const useBalancingRunner = (filename: string | null) => {
    const getModule = useModuleStore((s) => s.getModule);
    const overrides = useLeverStore((s) => s.overrides);
    const promotions = useLeverStore((s) => s.promotions);
    const levers = useLeverStore((s) => s.levers);
    const simulationConfig = useLeverStore((s) => s.simulationConfig);
    const setSimulationResult = useLeverStore((s) => s.setSimulationResult);
    const setIsRunning = useLeverStore((s) => s.setIsRunning);
    const log = useShellStore((s) => s.log);

    const runSimulation = useCallback(async () => {
        if (!filename) return;
        const cartridge = getModule(filename);
        if (!cartridge) return;

        // Validation
        if (!simulationConfig.scriptId) {
            log("error", "No simulation script selected.");
            return;
        }

        setIsRunning(true);
        try {
            // 1. Load Script
            const scriptContent = await vfs.readText(simulationConfig.scriptId);
            if (!scriptContent) {
                throw new Error(
                    `Script '${simulationConfig.scriptId}' not found or empty.`,
                );
            }

            // 2. Parse Script (Filter out non-setup commands)
            const lines = parseSimulationScript(scriptContent);

            // 3. Patch Cartridge
            const patched = patchCartridge(
                cartridge,
                overrides,
                promotions,
                levers,
            );

            // 4. Run Simulation
            const runner = new HeadlessRunner();
            const result = await runner.run({
                ticks: secondsToTicks(simulationConfig.durationSeconds),
                seed: "balance_test",
                cartridge: patched,
                initialSpawn: {
                    count: 0, // Explicitly 0; script handles spawning
                    blueprintId: "worker", // Dummy ID
                },
                runtimeFactory: buildRuntimeFactory(lines),
            });

            setSimulationResult(result);
            log("success", "Simulation completed.");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            log("error", `Balancing simulation failed: ${message}`);
        } finally {
            setIsRunning(false);
        }
    }, [
        filename,
        getModule,
        overrides,
        promotions,
        levers,
        simulationConfig,
        setSimulationResult,
        setIsRunning,
        log,
    ]);

    return { runSimulation };
};
