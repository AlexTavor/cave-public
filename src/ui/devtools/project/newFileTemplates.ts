import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import {
    DEFAULT_BACKGROUND_CONFIG,
    DEFAULT_VEIN_CONFIG,
} from "../../../data/schemas/assets";
import { createEmptyCartridge } from "../../../engine/vfs/bootstrap";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { createProjectManifest } from "../../../engine/workspace/projectManifest";

const normalizePath = (value: string) =>
    value.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+$/, "");

const buildSemanticTemplate = (
    path: string,
): Record<string, unknown> | string | null => {
    if (path.endsWith("manifest.json")) return createProjectManifest("Project");
    if (path.endsWith(".bp")) {
        const id = path.split("/").pop()?.replace(".bp", "") ?? "";
        return {
            id,
            label: "",
            tags: [],
            components: {},
            _editor: {},
        };
    }
    if (path.endsWith(".cave"))
        return {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
        };
    if (path.endsWith(".draft")) return { draftOptions: {}, draftPools: {} };
    if (path.endsWith(".art"))
        return {
            displays: {},
            styles: {},
            settings: {
                background: DEFAULT_BACKGROUND_CONFIG,
                vein_network: DEFAULT_VEIN_CONFIG,
            },
        };
    if (path.endsWith(".cvs")) return "# Cave script\n";
    return null;
};

export const resolveNewFileContent = (path: string): ModuleCartridge => {
    const normalized = normalizePath(path).toLowerCase();
    return (buildSemanticTemplate(normalized) ??
        createEmptyCartridge()) as unknown as ModuleCartridge;
};

