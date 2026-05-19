import { ModuleLinker } from "../../../engine/linker/ModuleLinker";
import { vfs } from "../../../engine/vfs/FileSystem";
import {
    DEFAULT_GAME_CONFIG,
    MenuAmbientConfigSchema,
    type MenuAmbientConfig,
} from "../../../data/schemas/game/config";

export const loadMenuAmbientConfig = async (
    manifestPath: string | null,
): Promise<MenuAmbientConfig> => {
    if (!manifestPath) return DEFAULT_GAME_CONFIG.menuAmbient;
    const root = manifestPath.replace(/\/manifest\.json$/, "");
    const linked = await new ModuleLinker(vfs).linkProject(root);
    return MenuAmbientConfigSchema.parse(
        linked.config.game_config?.menuAmbient ??
            DEFAULT_GAME_CONFIG.menuAmbient,
    );
};
