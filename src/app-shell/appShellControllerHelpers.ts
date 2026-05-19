import type { ModuleCartridge } from "../data/schemas/module";
import { toModuleCartridge } from "../engine/terminal/commands/projectCartridgeAdapter";
import { workspaceService } from "../engine/terminal/commands/projectServices";
import { useShellStore } from "../ui/devtools/shell/shell";
import { useAppShellStore } from "./useAppShellStore";

type RuntimeLoader = {
    loadCartridge?: (cartridge: ModuleCartridge, seed?: string) => void;
};

export const reopenMainMenu = () => {
    const shell = useAppShellStore.getState();
    if (shell.menuOrigin === "game") return shell.openMainMenuFromGame();
    if (shell.menuOrigin === "devtools") {
        return shell.openMainMenuFromDevtools();
    }
    return shell.openMainMenuFromBoot();
};

export const setShellError = (errorText: string | null) =>
    useAppShellStore.getState().setErrorText(errorText);

export const toggleEditor = (isOpen: boolean) =>
    useShellStore.getState().toggleEditor(isOpen);

export const loadWorkspaceCartridge = async (
    runtime: RuntimeLoader,
    runCommand: (command: string) => Promise<{ type: string }>,
    workspaceManifestPath: string,
) => {
    const activeCartridge = workspaceService.activeCartridge;
    if (
        workspaceService.getManifestPath() === workspaceManifestPath &&
        activeCartridge &&
        runtime.loadCartridge
    ) {
        runtime.loadCartridge(toModuleCartridge(activeCartridge));
        return { type: "success" };
    }
    return runCommand(`project-load ${workspaceManifestPath}`);
};

export const resolveContinueSaveName = (
    availableSaves: string[],
    currentSaveName: string | null,
): string | null => {
    if (currentSaveName && availableSaves.includes(currentSaveName)) {
        return currentSaveName;
    }
    if (availableSaves.includes("autosave")) return "autosave";
    return availableSaves[0] ?? null;
};

export const hasAutosave = (availableSaves: string[]) =>
    availableSaves.includes("autosave");
