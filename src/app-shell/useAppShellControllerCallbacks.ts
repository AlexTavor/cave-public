import { useCallback, useRef } from "react";
import type { ModuleCartridge } from "../data/schemas/module";
import { MAIN_MENU_CINEMATIC_LINES } from "./menuCinematics";
import {
    loadWorkspaceCartridge,
    reopenMainMenu,
    setShellError,
    toggleEditor,
} from "./appShellControllerHelpers";
import type { AppShellState } from "./useAppShellStore";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";
import {
    captureTutorialSessionState,
    restoreTutorialSessionState,
    type TutorialSessionState,
} from "./tutorialSessionState";
import { enqueueRunNumberBootstrap } from "../game/facts/runNumberFact";
import { usePostHog } from "@posthog/react";

interface RuntimeLike {
    deleteSave: (name: string) => Promise<void>;
    loadCartridge?: (cartridge: ModuleCartridge, seed?: string) => void;
    loadGame: (name: string) => Promise<void>;
    pause: () => void;
    play: () => void;
    saveGame: (name: string) => Promise<void>;
    unload?: () => void;
}

export const useAppShellControllerCallbacks = (params: {
    continueSaveName: string | null;
    runCommand: (command: string) => Promise<{ type: string }>;
    runtime: RuntimeLike;
    shell: AppShellState;
    workspaceManifestPath?: string;
}) => {
    const posthog = usePostHog();
    const tutorialSessionRef = useRef<TutorialSessionState>({
        completionMemory: {},
        mode: 1,
    });

    const handleNewGame = useCallback(async () => {
        if (!params.workspaceManifestPath) {
            return setShellError("Workspace manifest unavailable.");
        }
        setShellError(null);
        tutorialSessionRef.current = captureTutorialSessionState(
            useRuntimeStore.getState().runtime,
        );
        if (params.shell.hasActiveGameSession) {
            params.runtime.pause();
            params.runtime.unload?.();
            params.shell.endGameplaySession();
        }
        const result = await loadWorkspaceCartridge(
            params.runtime,
            params.runCommand,
            params.workspaceManifestPath,
        );
        if (result.type === "error") return;
        posthog?.capture("new_game_started");
        toggleEditor(false);
        params.shell.startGameplaySession();
        params.shell.showMainMenuCinematic(MAIN_MENU_CINEMATIC_LINES);
    }, [params, posthog]);

    const handleContinue = useCallback(async () => {
        setShellError(null);
        if (!params.shell.hasActiveGameSession && params.continueSaveName) {
            await params.runtime.loadGame(params.continueSaveName);
            toggleEditor(false);
            params.shell.startGameplaySession();
        }
        posthog?.capture("game_continued");
        params.shell.returnToGame();
        params.runtime.play();
    }, [params, posthog]);

    const handleCinematicComplete = useCallback(async () => {
        if (params.shell.cinematicSource !== "main-menu") {
            params.runtime.play();
            params.shell.closeOverlay();
            return;
        }
        setShellError(null);
        const result = await params.runCommand("run example/scripts/start.cvs");
        if (result.type === "error") return;
        const runtime = useRuntimeStore.getState().runtime;
        if (!runtime) {
            setShellError("New game start failed: runtime unavailable.");
            return;
        }
        restoreTutorialSessionState(runtime, tutorialSessionRef.current);
        tutorialSessionRef.current = { completionMemory: {}, mode: 1 };
        params.shell.closeOverlay();
        enqueueRunNumberBootstrap(runtime.commands, 0);
        runtime.flushCommands?.();
        params.runtime.play();
    }, [params]);

    return {
        handleContinue,
        handleCinematicComplete,
        handleNewGame,
        onDelete: async (name: string) => {
            await params.runtime.deleteSave(name);
            posthog?.capture("save_deleted", { save_name: name });
        },
        onDialogClose: reopenMainMenu,
        onLoad: async (name: string) => {
            await params.runtime.loadGame(name);
            posthog?.capture("game_loaded", { save_name: name });
            toggleEditor(false);
            params.shell.startGameplaySession();
            params.shell.returnToGame();
            params.runtime.play();
        },
        onNewGameBack: reopenMainMenu,
        onOpenMenu: () => {
            if (params.shell.surface === "devtools") {
                toggleEditor(false);
                return params.shell.openMainMenuFromDevtools();
            }
            params.runtime.pause();
            params.shell.openMainMenuFromGame();
        },
        onSaveAs: async (name: string) => {
            await params.runtime.saveGame(name);
            posthog?.capture("game_saved", { save_name: name });
            reopenMainMenu();
        },
    };
};
