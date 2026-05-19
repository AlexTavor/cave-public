/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { createCartridge } from "../../../../engine/test/factories";
import { IconRegistryProvider } from "../../../lib/foundation/icon-registry/IconRegistryProvider";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { PortalManager } from "../../../lib/foundation/portal-manager/PortalManager";
import { GlobalEditorToolbar } from "../../shell/GlobalEditorToolbar";
import { useShellStore } from "../../shell/shell";
import { parseVirtualPath } from "../../shell/window-manager/virtualPath";
import { useModuleStore } from "../../state/moduleStore";
import { useSessionStore } from "../../state/useSessionStore";
import { useExplorerStore } from "../fields/module-explorer/state/explorerStore";
import { ModuleExplorer } from "../fields/module-explorer/ModuleExplorer";
import { AssetListPanel } from "../fields/module-explorer/AssetListPanel";
import { AssetEditor } from "./AssetEditor";

export const filename = "game_data.json";
export const baseModule: ModuleCartridge = createCartridge(filename, {
    metadata: { id: filename, name: "Game Data", version: "0.0.1" },
    assets: {
        displays: {},
        styles: { ember: {} as any },
        glyphs: { flame: {} as any },
    } as any,
});

export const setupAssetFlow = (moduleData: ModuleCartridge = baseModule) => {
    useShellStore.setState({
        activeFilePath: null,
        activeModuleFilename: null,
        isEditorOpen: true,
        tabTitles: {},
    });
    useExplorerStore.setState({ sessions: {} });
    useSessionStore.setState({ sessions: {} });
    globalThis.localStorage?.removeItem(`cave.moduleDraft:${filename}`);
    const saveModuleCartridge = vi.fn(async ({ filename: target, module }) => {
        useModuleStore.setState((state: any) => ({
            modules: { ...state.modules, [target]: module },
        }));
        return module;
    });
    const saveAssetToModule = vi.fn(
        async ({ filename: target, assetId, assetData }) => {
            const mod = useModuleStore.getState().modules[target];
            const next = {
                ...mod,
                assets: {
                    ...mod.assets,
                    displays: { ...mod.assets.displays, [assetId]: assetData },
                },
            };
            useModuleStore.setState((state: any) => ({
                modules: { ...state.modules, [target]: next },
            }));
            return next;
        },
    );
    const deleteAssetFromModule = vi.fn(
        async ({ filename: target, assetId }) => {
            const mod = useModuleStore.getState().modules[target];
            const displays = { ...mod.assets.displays };
            delete displays[assetId];
            useModuleStore.setState((state: any) => ({
                modules: {
                    ...state.modules,
                    [target]: { ...mod, assets: { ...mod.assets, displays } },
                },
            }));
        },
    );
    useModuleStore.setState({
        modules: { [filename]: moduleData },
        loading: {},
        loadOrder: [filename],
        loadModule: vi.fn(async () => {}),
        saveModuleCartridge,
        saveAssetToModule,
        deleteAssetFromModule,
        getModule: (target: string) =>
            useModuleStore.getState().modules[target] ?? null,
    } as any);
    const Shell = () => {
        const activePath = useShellStore((s) => s.activeFilePath);
        const parsed = activePath ? parseVirtualPath(activePath) : null;
        return (
            <ThemeProvider>
                <PortalManager>
                    <IconRegistryProvider>
                        <GlobalEditorToolbar />
                        <ModuleExplorer filename={filename} />
                        {parsed?.kind === "list" &&
                            parsed.section === "assets" && (
                                <AssetListPanel
                                    filename={parsed.filename}
                                    category={parsed.category}
                                />
                            )}
                        {parsed?.kind === "asset" && (
                            <AssetEditor
                                filename={parsed.filename}
                                category={parsed.category}
                                assetId={parsed.assetId}
                            />
                        )}
                    </IconRegistryProvider>
                </PortalManager>
            </ThemeProvider>
        );
    };
    return render(<Shell />);
};
