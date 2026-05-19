import type { VirtualPath } from "./virtualPath.types";
import { PATH_SEPARATOR } from "./virtualPath.constants";

export function serializeVirtualPath(path: VirtualPath): string {
    switch (path.kind) {
        case "module":
            return `module${PATH_SEPARATOR}${path.filename}`;
        case "meta":
            return `meta${PATH_SEPARATOR}${path.filename}`;
        case "physics":
            return `physics${PATH_SEPARATOR}${path.filename}`;
        case "options":
            return `options${PATH_SEPARATOR}${path.filename}`;
        case "game_config":
            return `game_config${PATH_SEPARATOR}${path.filename}`;
        case "background_config":
            return `background_config${PATH_SEPARATOR}${path.filename}`;
        case "vein_config":
            return `vein_config${PATH_SEPARATOR}${path.filename}`;
        case "world_entity":
            return `world_entity${PATH_SEPARATOR}${path.filename}`;
        case "traits":
            return `traits${PATH_SEPARATOR}${path.filename}`;
        case "conditions":
            return `conditions${PATH_SEPARATOR}${path.filename}`;
        case "guidances":
            return `guidances${PATH_SEPARATOR}${path.filename}`;
        case "tutorials":
            return `tutorials${PATH_SEPARATOR}${path.filename}`;
        case "knowledge":
            return `knowledge${PATH_SEPARATOR}${path.filename}`;
        case "understanding":
            return `understanding${PATH_SEPARATOR}${path.filename}`;
        case "camera_world":
            return `camera_world${PATH_SEPARATOR}${path.filename}`;
        case "carrier":
            return `carrier${PATH_SEPARATOR}${path.filename}`;
        case "body":
            return `body${PATH_SEPARATOR}${path.filename}`;
        case "pool":
            return `pool${PATH_SEPARATOR}${path.filename}${PATH_SEPARATOR}${path.poolId}`;
        case "list":
            if (path.section === "blueprints") {
                return `list${PATH_SEPARATOR}${path.filename}${PATH_SEPARATOR}blueprints`;
            }
            if (path.section === "draft_pools") {
                return `list${PATH_SEPARATOR}${path.filename}${PATH_SEPARATOR}draft_pools`;
            }
            return `list${PATH_SEPARATOR}${path.filename}${PATH_SEPARATOR}assets${PATH_SEPARATOR}${path.category}`;
        case "blueprint":
            return `${path.filename}${PATH_SEPARATOR}blueprints${PATH_SEPARATOR}${path.blueprintId}`;
        case "asset":
            return `${path.filename}${PATH_SEPARATOR}assets${PATH_SEPARATOR}${path.category}${PATH_SEPARATOR}${path.assetId}`;
        default: {
            const _exhaustive: never = path;
            return _exhaustive;
        }
    }
}

