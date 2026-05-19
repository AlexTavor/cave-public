import { serializeVirtualPath } from "./virtualPath";
import { isAssetCategory } from "./virtualPath.constants";

const decode = (value: string) => decodeURIComponent(value);

const SIMPLE_PREFIXES = [
    ["meta:", "meta", "meta::"],
    ["physics:", "physics", "physics::"],
    ["options:", "options", "options::"],
    ["game_config:", "game_config", "game_config::"],
    ["background_config:", "background_config", "background_config::"],
    ["traits:", "traits", "traits::"],
    ["conditions:", "conditions", "conditions::"],
    ["guidances:", "guidances", "guidances::"],
    ["tutorials:", "tutorials", "tutorials::"],
    ["knowledge:", "knowledge", "knowledge::"],
    ["understanding:", "understanding", "understanding::"],
    ["vein_config:", "vein_config", "vein_config::"],
    ["camera_world:", "camera_world", "camera_world::"],
    ["carrier:", "carrier", "carrier::"],
    ["body:", "body", "body::"],
] as const;

export const tabIdToVirtualPath = (tabId: string): string | null => {
    if (tabId.startsWith("file:")) return decode(tabId.slice(5));
    for (const [prefix, key, routePrefix] of SIMPLE_PREFIXES) {
        if (tabId.startsWith(prefix)) {
            return toSimple(tabId, key, routePrefix);
        }
    }
    if (tabId.startsWith("list:draft_pools:"))
        return toList(tabId, "list:draft_pools:", "draft_pools");
    if (tabId.startsWith("list:blueprints:"))
        return toList(tabId, "list:blueprints:", "blueprints");
    if (tabId.startsWith("list:assets:")) return toAssetList(tabId);
    if (tabId.startsWith("pool:")) return toPool(tabId);
    if (tabId.startsWith("bp:")) return toBlueprint(tabId);
    if (tabId.startsWith("asset:")) return toAsset(tabId);
    return null;
};

const toSimple = (tabId: string, prefix: string, routePrefix: string) => {
    const encoded = tabId.slice(prefix.length + 1);
    return encoded ? `${routePrefix}${decode(encoded)}` : null;
};

const toList = (
    tabId: string,
    prefix: string,
    section: "draft_pools" | "blueprints",
) => {
    const encoded = tabId.slice(prefix.length);
    if (!encoded) return null;
    return serializeVirtualPath({
        kind: "list",
        filename: decode(encoded),
        section,
    });
};

const toAssetList = (tabId: string) => {
    const parts = tabId.split(":");
    if (parts.length !== 4) return null;
    const category = decode(parts[3]);
    if (!isAssetCategory(category)) return null;
    return serializeVirtualPath({
        kind: "list",
        filename: decode(parts[2]),
        section: "assets",
        category,
    });
};

const toPool = (tabId: string) => {
    const parts = tabId.split(":");
    if (parts.length !== 3) return null;
    return serializeVirtualPath({
        kind: "pool",
        filename: decode(parts[1]),
        poolId: decode(parts[2]),
    });
};

const toBlueprint = (tabId: string) => {
    const parts = tabId.split(":");
    if (parts.length !== 3) return null;
    return serializeVirtualPath({
        kind: "blueprint",
        filename: decode(parts[1]),
        blueprintId: decode(parts[2]),
    });
};

const toAsset = (tabId: string) => {
    const parts = tabId.split(":");
    if (parts.length !== 4) return null;
    const category = decode(parts[2]);
    if (!isAssetCategory(category)) return null;
    return serializeVirtualPath({
        kind: "asset",
        filename: decode(parts[1]),
        category,
        assetId: decode(parts[3]),
    });
};

