import { useCallback, useEffect, useState } from "react";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { toModuleCartridge } from "../../../engine/terminal/commands/projectCartridgeAdapter";
import { createLayoutRuntime } from "./simulation/createLayoutRuntime";

interface LayoutEditorHydrationDeps {
    manifestPath: string;
    log: (level: "error" | "success" | "info", message: string) => void;
}

export const useLayoutEditorHydration = ({
    manifestPath,
    log,
}: LayoutEditorHydrationDeps) => {
    const [runtime, setRuntimeState] = useState<Runtime | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const replaceRuntime = useCallback((newRuntime: Runtime | null) => {
        setRuntimeState((current) => {
            if (current && current !== newRuntime) current.destroy();
            return newRuntime;
        });
    }, []);

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);

        const hydrate = async () => {
            try {
                await workspaceService.loadProject(manifestPath);
                const linked = workspaceService.activeCartridge;
                if (!linked)
                    throw new Error("Loaded project has no cartridge.");
                const simulation = createLayoutRuntime(
                    toModuleCartridge(linked),
                    { disablePeerBlueprintSpawns: true },
                );

                if (!mounted) {
                    simulation.destroy();
                    return;
                }

                replaceRuntime(simulation);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                log("error", `Failed to start layout mode: ${message}`);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        hydrate();

        return () => {
            mounted = false;
            replaceRuntime(null);
        };
    }, [log, manifestPath, replaceRuntime]);

    return {
        runtime,
        isLoading,
        replaceRuntime,
    };
};

