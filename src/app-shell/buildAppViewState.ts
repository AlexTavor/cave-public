import type { AppShellState } from "./useAppShellStore";

export interface AppViewState {
    chrome: "full" | "minimal";
    menuVisible: boolean;
    menuButtonVisible: boolean;
    showNewGameOverlay: boolean;
    showSaveLoadOverlay: boolean;
    showCinematicOverlay: boolean;
    showEditorOverlay: boolean;
}

export const buildAppViewState = (shell: AppShellState): AppViewState => ({
    chrome:
        shell.surface === "game" && shell.overlay === "none"
            ? "full"
            : "minimal",
    menuVisible: shell.overlay === "main-menu" || shell.overlay === "new-game",
    menuButtonVisible: shell.overlay === "none",
    showNewGameOverlay: shell.overlay === "new-game",
    showSaveLoadOverlay:
        shell.overlay === "save-menu" || shell.overlay === "load-menu",
    showCinematicOverlay: shell.overlay === "cinematic",
    showEditorOverlay: shell.surface === "devtools" && shell.overlay === "none",
});
