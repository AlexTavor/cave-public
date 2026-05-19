import { useMemo } from "react";
import { useModuleStore } from "../state/moduleStore";
import { fileCache } from "../../../engine/terminal/fileUtils";
import { ResourceProvider } from "../../../lib/terminal";
import { ASSET_CATEGORY_DISPLAYS } from "../state/moduleStore.assets";
import type { ModuleCartridge } from "../../../data/schemas/module";

const MODULE_CATEGORY_BLUEPRINTS = "blueprints" as const;

export function useGameResourceAdapter(): ResourceProvider {
    const modules = useModuleStore((s) => s.modules);

    return useMemo(() => {
        return {
            hasFile: (filename: string) =>
                Boolean(modules[filename]) || fileCache.includes(filename),
            getModule: (filename: string) =>
                (modules[filename] as ModuleCartridge | undefined) ?? null,
            getModules: () =>
                Object.values(modules) as unknown as ModuleCartridge[],
            resolveModuleKeys: (filename: string, category: string) => {
                const moduleData = modules[filename];
                if (!moduleData) return [];

                if (category === ASSET_CATEGORY_DISPLAYS) {
                    return Object.keys(moduleData.assets?.displays ?? {});
                }

                if (category === MODULE_CATEGORY_BLUEPRINTS) {
                    return Object.keys(moduleData.blueprints ?? {});
                }

                return [];
            },
        };
    }, [modules]);
}

