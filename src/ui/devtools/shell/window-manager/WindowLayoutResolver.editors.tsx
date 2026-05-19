import React from "react";
import type { TabNode } from "flexlayout-react";
import { AssetEditor } from "../../editors/assets/AssetEditor";
import { AssetListPanel } from "../../editors/fields/module-explorer/AssetListPanel";
import { ModuleMetadataEditor } from "../../editors/fields/module-metadata-editor/ModuleMetadataEditor";
import { BlueprintListPanel } from "../../editors/fields/module-explorer/BlueprintListPanel";
import { BlueprintEditor } from "../../editors/blueprint/editor/BlueprintEditor";
import { AssetCategoryEditor } from "../../editors/config/AssetCategoryEditor";
import { BlueprintFileEditor } from "../../editors/file/BlueprintFileEditor";
import { CvsEditor } from "../../editors/file/CvsEditor";
import { AssetPackEditor } from "../../editors/file/AssetPackEditor";
import { SystemConfigEditor } from "../../editors/file/SystemConfigEditor";
import { DraftPackEditor } from "../../editors/file/DraftPackEditor";
import { DraftOptionsPanel } from "../../editors/draft/options/DraftOptionsPanel";
import { DraftPoolListPanel } from "../../editors/draft/pools/DraftPoolListPanel";
import { DraftPoolEditor } from "../../editors/draft/pools/DraftPoolEditor";
import { ManifestEditor } from "../../editors/manifest/ManifestEditor";
import { RawJsonEditor } from "../../editors/manifest/RawJsonEditor";
import { UnknownFileViewer } from "../../editors/manifest/UnknownFileViewer";
import { getExtension, isManifest } from "./fileRouting";
import { resolveConfigEditor } from "./WindowLayoutResolver.configEditors";

const resolveFileComponent = (path: string) => {
    switch (getExtension(path)) {
        case ".bp":
            return <BlueprintFileEditor filename={path} />;
        case ".cvs":
            return <CvsEditor filename={path} />;
        case ".art":
            return <AssetPackEditor filename={path} />;
        case ".cave":
            return <SystemConfigEditor filename={path} />;
        case ".draft":
            return <DraftPackEditor filename={path} />;
        case ".json":
            return isManifest(path) ? (
                <ManifestEditor filename={path} />
            ) : (
                <RawJsonEditor filename={path} />
            );
        default:
            return <UnknownFileViewer path={path} />;
    }
};

export const resolveEditorComponent = (
    node: TabNode,
): React.ReactElement | null => {
    const component = node.getComponent();
    const config = node.getConfig?.() ?? {};

    switch (component) {
        case "file":
            return resolveFileComponent(String(config.path ?? ""));
        case "blueprint_list":
            return <BlueprintListPanel filename={config.filename} />;
        case "asset_list":
            if (config.category !== "displays") {
                return (
                    <AssetCategoryEditor
                        filename={config.filename}
                        category={config.category}
                    />
                );
            }
            return (
                <AssetListPanel
                    filename={config.filename}
                    category={config.category}
                />
            );
        case "meta":
            return (
                <ModuleMetadataEditor
                    filename={config.filename}
                    tabId={node.getId()}
                />
            );
        case "blueprint":
            return (
                <BlueprintEditor
                    filename={config.filename}
                    blueprintId={config.blueprintId}
                />
            );
        case "asset":
            return (
                <AssetEditor
                    filename={config.filename}
                    category={config.category}
                    assetId={config.assetId}
                    tabId={node.getId()}
                />
            );
        case "draft_options":
            return <DraftOptionsPanel filename={config.filename} />;
        case "draft_pool_list":
            return <DraftPoolListPanel filename={config.filename} />;
        case "draft_pool_editor":
            return (
                <DraftPoolEditor
                    filename={config.filename}
                    poolId={config.poolId}
                />
            );
        default:
            return resolveConfigEditor(component ?? "", config);
    }
};

