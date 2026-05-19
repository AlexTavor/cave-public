import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { toModuleCartridge } from "../../../engine/terminal/commands/projectCartridgeAdapter";
import { useShellStore } from "./shell";
import { useLayoutStore } from "../state/useLayoutStore";
import { openFileTab } from "./window-manager/openFileTab";
import { resetProjectHistory } from "../state/useProjectHistoryStore";

const isManifest = (path: string) =>
    path.toLowerCase().endsWith("manifest.json");

export interface LoadProjectResult {
    ok: boolean;
    message: string;
}

export const loadProjectFromManifest = async (
    manifestPath: string,
    runtime?: { loadCartridge?: (c: unknown) => void },
): Promise<LoadProjectResult> => {
    if (!isManifest(manifestPath)) {
        return { ok: false, message: `'${manifestPath}' is not a manifest.` };
    }
    try {
        await workspaceService.loadProject(manifestPath);
        useShellStore.getState().setActiveManifest(manifestPath);
        await resetProjectHistory();

        const openTab = useLayoutStore.getState().openTab;
        openFileTab(openTab, manifestPath);
        useShellStore.getState().setActiveFileTabPath(manifestPath);

        const cartridge = workspaceService.activeCartridge;
        if (cartridge && runtime?.loadCartridge) {
            runtime.loadCartridge(toModuleCartridge(cartridge));
        }
        return { ok: true, message: `Loaded '${manifestPath}'.` };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
        };
    }
};

export const isManifestPath = isManifest;
