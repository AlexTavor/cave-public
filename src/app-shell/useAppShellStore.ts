import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type AppShellSurface = "game" | "devtools";
export type AppShellOverlay =
    | "none"
    | "main-menu"
    | "new-game"
    | "save-menu"
    | "load-menu"
    | "cinematic";
export type AppShellMenuOrigin = "boot" | "game" | "devtools";
export type AppShellCinematicSource = "main-menu" | "runtime" | null;

export interface AppShellState {
    surface: AppShellSurface;
    overlay: AppShellOverlay;
    menuOrigin: AppShellMenuOrigin;
    cinematicLines: string[] | null;
    cinematicSource: AppShellCinematicSource;
    hasActiveGameSession: boolean;
    errorText: string | null;
    openMainMenuFromBoot: () => void;
    openMainMenuFromGame: () => void;
    openMainMenuFromDevtools: () => void;
    openNewGameMenu: () => void;
    openSaveMenu: () => void;
    openLoadMenu: () => void;
    openDevtools: () => void;
    closeDevtools: () => void;
    startGameplaySession: () => void;
    endGameplaySession: () => void;
    showMainMenuCinematic: (lines: string[]) => void;
    showRuntimeCinematic: (lines: string[]) => void;
    closeOverlay: () => void;
    returnToGame: () => void;
    setErrorText: (errorText: string | null) => void;
}

const setMainMenu = (
    state: AppShellState,
    menuOrigin: AppShellMenuOrigin,
): void => {
    state.surface = "game";
    state.overlay = "main-menu";
    state.menuOrigin = menuOrigin;
};

const clearCinematic = (state: AppShellState): void => {
    state.cinematicLines = null;
    state.cinematicSource = null;
};

const setOverlay = (state: AppShellState, overlay: AppShellOverlay): void => {
    state.overlay = overlay;
};

const setGameplaySession = (state: AppShellState, isActive: boolean): void => {
    state.hasActiveGameSession = isActive;
};

export const useAppShellStore = create<AppShellState>()(
    immer((set) => ({
        surface: "game",
        overlay: "main-menu",
        menuOrigin: "boot",
        cinematicLines: null,
        cinematicSource: null,
        hasActiveGameSession: false,
        errorText: null,
        openMainMenuFromBoot: () => set((state) => setMainMenu(state, "boot")),
        openMainMenuFromGame: () => set((state) => setMainMenu(state, "game")),
        openMainMenuFromDevtools: () =>
            set((state) => setMainMenu(state, "devtools")),
        openNewGameMenu: () => set((state) => setOverlay(state, "new-game")),
        openSaveMenu: () => set((state) => setOverlay(state, "save-menu")),
        openLoadMenu: () => set((state) => setOverlay(state, "load-menu")),
        openDevtools: () =>
            set((state) => {
                state.surface = "devtools";
                state.overlay = "none";
            }),
        closeDevtools: () =>
            set((state) => {
                state.surface = "game";
                state.overlay = "none";
            }),
        startGameplaySession: () =>
            set((state) => setGameplaySession(state, true)),
        endGameplaySession: () =>
            set((state) => setGameplaySession(state, false)),
        showMainMenuCinematic: (lines) =>
            set((state) => {
                state.surface = "game";
                state.overlay = "cinematic";
                state.cinematicLines = [...lines];
                state.cinematicSource = "main-menu";
            }),
        showRuntimeCinematic: (lines) =>
            set((state) => {
                state.surface = "game";
                state.overlay = "cinematic";
                state.cinematicLines = [...lines];
                state.cinematicSource = "runtime";
            }),
        closeOverlay: () =>
            set((state) => {
                state.overlay = "none";
                clearCinematic(state);
            }),
        returnToGame: () =>
            set((state) => {
                state.surface = "game";
                state.overlay = "none";
                clearCinematic(state);
            }),
        setErrorText: (errorText) =>
            set((state) => {
                state.errorText = errorText;
            }),
    })),
);
