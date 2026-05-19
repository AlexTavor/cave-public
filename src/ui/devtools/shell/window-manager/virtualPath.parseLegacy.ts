import { ASSET_CATEGORY_DISPLAYS } from "../../state/moduleStore.assets";
import type { VirtualPath } from "./virtualPath.types";
import { PATH_SEPARATOR, isAssetCategory } from "./virtualPath.constants";

export function parseLegacyPath(
    filename: string,
    segments: string[],
): VirtualPath {
    if (segments.length === 0) {
        return { kind: "module", filename };
    }

    const [segment, ...rest] = segments;
    if (segment === "metadata" || segment === "meta") {
        return { kind: "meta", filename };
    }

    if (segment === "blueprints") {
        if (rest.length === 0) {
            return { kind: "list", filename, section: "blueprints" };
        }
        return {
            kind: "blueprint",
            filename,
            blueprintId: rest.join(PATH_SEPARATOR),
        };
    }

    if (segment === "assets") {
        if (rest.length === 0) {
            return {
                kind: "list",
                filename,
                section: "assets",
                category: ASSET_CATEGORY_DISPLAYS,
            };
        }
        const [category, ...assetRest] = rest;
        if (!category || !isAssetCategory(category)) {
            return { kind: "module", filename };
        }
        if (assetRest.length === 0) {
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
            assetId: assetRest.join(PATH_SEPARATOR),
        };
    }

    return {
        kind: "blueprint",
        filename,
        blueprintId: segments.join(PATH_SEPARATOR),
    };
}

