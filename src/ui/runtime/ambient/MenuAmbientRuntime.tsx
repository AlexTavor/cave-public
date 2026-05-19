import { useEffect, useMemo, useState } from "react";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { RuntimeShellCanvas } from "../shell/RuntimeShellCanvas";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { createAmbientWorldContext } from "./ambientWorldContext";
import { buildMenuAmbientRuntime } from "./buildMenuAmbientRuntime";
import { loadMenuAmbientConfig } from "./loadMenuAmbientConfig";

export interface MenuAmbientRuntimeProps {
    manifestPath: string | null;
}

export const MenuAmbientRuntime = ({
    manifestPath,
}: MenuAmbientRuntimeProps) => {
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const value = useMemo(() => createAmbientWorldContext(runtime), [runtime]);

    useEffect(() => {
        let active = true;
        let tick: number | undefined;
        let nextRuntime: Runtime | null = null;
        setRuntime(null);
        void loadMenuAmbientConfig(manifestPath)
            .catch((error) => {
                console.error(error);
                return DEFAULT_GAME_CONFIG.menuAmbient;
            })
            .then((config) => {
                if (!active) return;
                nextRuntime = buildMenuAmbientRuntime(
                    config,
                    `menu-ambient:${manifestPath ?? "default"}`,
                );
                const loop = () => {
                    nextRuntime?.tick(16);
                    tick = globalThis.setTimeout(loop, 16) as unknown as number;
                };
                loop();
                setRuntime(nextRuntime);
            });
        return () => {
            active = false;
            if (tick) globalThis.clearTimeout(tick);
            nextRuntime?.destroy();
        };
    }, [manifestPath]);

    return (
        <WorldInteractionContext.Provider value={value}>
            <RuntimeShellCanvas
                chrome="minimal"
                hiddenUntilTick={2}
                inputTarget="window"
            />
        </WorldInteractionContext.Provider>
    );
};
