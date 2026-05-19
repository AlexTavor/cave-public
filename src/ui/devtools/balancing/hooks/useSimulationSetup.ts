import { useEffect, useState } from "react";
import { useShellStore } from "../../shell/shell";
import { useLeverStore } from "../state/useLeverStore";
import { vfs } from "../../../../engine/vfs/FileSystem";

export const useSimulationSetup = () => {
    const config = useLeverStore((s) => s.simulationConfig);
    const setConfig = useLeverStore((s) => s.setSimulationConfig);
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);

    const [scriptIds, setScriptIds] = useState<string[]>([]);

    useEffect(() => {
        let mounted = true;

        const loadScripts = async () => {
            const files = await vfs.listFiles();
            if (!mounted) return;

            const scripts = files
                .filter((f) => f.endsWith(".cvs"))
                .sort((a, b) => a.localeCompare(b));
            setScriptIds(scripts);

            // Auto-select logic
            // 1. Try matching the active module name (e.g. game_data.json -> game_data.cvs)
            // 2. Try 'game_loop.cvs'
            // 3. Fallback to first available script
            if (activeModuleFilename) {
                const baseName = activeModuleFilename.replace(/\.json$/, "");
                const match = `${baseName}.cvs`;

                if (scripts.includes(match)) {
                    setConfig({ scriptId: match });
                    return;
                }
            }

            if (scripts.includes("game_loop.cvs")) {
                setConfig({ scriptId: "game_loop.cvs" });
                return;
            }

            if (scripts.length > 0 && !config.scriptId) {
                setConfig({ scriptId: scripts[0] });
            }
        };

        loadScripts();

        return () => {
            mounted = false;
        };
    }, [activeModuleFilename, config.scriptId, setConfig]);

    return { config, setConfig, scriptIds };
};
