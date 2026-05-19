import { TabNode } from "flexlayout-react";
import { isAssetCategory } from "./virtualPath.constants";
import { serializeVirtualPath } from "./virtualPath.serialize";

/**
 * Extracts the application's "Virtual Path" string from a FlexLayout TabNode.
 * Returns null if the node does not represent a routable resource.
 */
export function getVirtualPathFromNode(node: TabNode): string | null {
    const config = node.getConfig();
    const component = node.getComponent() ?? "";

    if (!config?.filename) return null;

    const simpleHandlers: Record<string, () => string> = {
        meta: () =>
            serializeVirtualPath({ kind: "meta", filename: config.filename }),
        physics: () =>
            serializeVirtualPath({
                kind: "physics",
                filename: config.filename,
            }),
        draft_options: () =>
            serializeVirtualPath({
                kind: "options",
                filename: config.filename,
            }),
        draft_pool_list: () =>
            serializeVirtualPath({
                kind: "list",
                filename: config.filename,
                section: "draft_pools",
            }),
        blueprint_list: () =>
            serializeVirtualPath({
                kind: "list",
                filename: config.filename,
                section: "blueprints",
            }),
    };

    const handler = simpleHandlers[component];
    if (handler) return handler();

    return (
        resolveDraftPoolEditor(component, config) ??
        resolveAssetList(component, config) ??
        resolveBlueprint(component, config) ??
        resolveAsset(component, config)
    );
}

const resolveDraftPoolEditor = (component: string, config: any) => {
    if (component !== "draft_pool_editor") return null;
    if (!config.poolId) return null;
    return serializeVirtualPath({
        kind: "pool",
        filename: config.filename,
        poolId: config.poolId,
    });
};

const resolveAssetList = (component: string, config: any) => {
    if (component !== "asset_list") return null;
    if (!isAssetCategory(config.category)) return null;
    return serializeVirtualPath({
        kind: "list",
        filename: config.filename,
        section: "assets",
        category: config.category,
    });
};

const resolveBlueprint = (component: string, config: any) => {
    if (component !== "blueprint") return null;
    if (!config.blueprintId) return null;
    return serializeVirtualPath({
        kind: "blueprint",
        filename: config.filename,
        blueprintId: config.blueprintId,
    });
};

const resolveAsset = (component: string, config: any) => {
    if (component !== "asset") return null;
    if (!isAssetCategory(config.category)) return null;
    if (!config.assetId) return null;
    return serializeVirtualPath({
        kind: "asset",
        filename: config.filename,
        category: config.category,
        assetId: config.assetId,
    });
};
