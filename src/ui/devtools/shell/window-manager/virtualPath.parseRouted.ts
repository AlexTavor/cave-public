import { ASSET_CATEGORY_DISPLAYS } from "../../state/moduleStore.assets";
import type { VirtualPath } from "./virtualPath.types";
import {
    isAssetCategory,
    PATH_SEPARATOR,
    type RoutePrefix,
} from "./virtualPath.constants";

export function parseRoutedPath(
    prefix: RoutePrefix,
    segments: string[],
): VirtualPath {
    const filename = segments[0] ?? "";
    if (!filename) return { kind: "module", filename: "" };
    if (isSimpleConfigRoute(prefix)) {
        return { kind: prefix, filename } as VirtualPath;
    }

    switch (prefix) {
        case "pool": {
            const poolId = segments.slice(1).join(PATH_SEPARATOR);
            if (!poolId) {
                return { kind: "list", filename, section: "draft_pools" };
            }
            return { kind: "pool", filename, poolId };
        }
        case "list":
            return parseListRoute(filename, segments.slice(1));
        case "blueprint":
            return parseBlueprintRoute(filename, segments.slice(1));
        case "asset":
            return parseAssetRoute(filename, segments.slice(1));
    }
    return { kind: "module", filename };
}

const SIMPLE_CONFIG_ROUTES = new Set<RoutePrefix>([
    "module",
    "meta",
    "physics",
    "options",
    "game_config",
    "background_config",
    "vein_config",
    "world_entity",
    "traits",
    "conditions",
    "guidances",
    "tutorials",
    "knowledge",
    "understanding",
    "camera_world",
    "carrier",
    "body",
]);

const isSimpleConfigRoute = (prefix: RoutePrefix): boolean =>
    SIMPLE_CONFIG_ROUTES.has(prefix);

function parseListRoute(filename: string, segments: string[]): VirtualPath {
    const [section, category] = segments;
    if (section === "blueprints") {
        return { kind: "list", filename, section: "blueprints" };
    }

    if (section === "draft_pools") {
        return { kind: "list", filename, section: "draft_pools" };
    }

    if (section === "assets") {
        const resolvedCategory = category ?? ASSET_CATEGORY_DISPLAYS;
        if (!isAssetCategory(resolvedCategory)) {
            return { kind: "module", filename };
        }
        return {
            kind: "list",
            filename,
            section: "assets",
            category: resolvedCategory,
        };
    }

    return { kind: "module", filename };
}

function parseBlueprintRoute(
    filename: string,
    segments: string[],
): VirtualPath {
    const blueprintId = segments.join(PATH_SEPARATOR);
    if (!blueprintId) {
        return { kind: "list", filename, section: "blueprints" };
    }
    return { kind: "blueprint", filename, blueprintId };
}

function parseAssetRoute(filename: string, segments: string[]): VirtualPath {
    const [category, ...assetParts] = segments;
    if (!category || !isAssetCategory(category)) {
        return { kind: "module", filename };
    }
    if (assetParts.length === 0) {
        return {
            kind: "list",
            filename,
            section: "assets",
            category,
        };
    }
    return {
        kind: "asset",
        filename,
        category,
        assetId: assetParts.join(PATH_SEPARATOR),
    };
}

