import { useCallback, useEffect, useMemo } from "react";
import { MAIN_MENU_CINEMATIC_LINES } from "./menuCinematics";
import { buildMainMenuActions } from "./buildMainMenuActions";
import { getMainMenuStatusText } from "./getMainMenuStatusText";
import {
    hasAutosave,
    resolveContinueSaveName,
    setShellError,
    toggleEditor,
} from "./appShellControllerHelpers";
import { createShellCommandExecutor } from "./shellCommandExecutor";
import { toShellText } from "./shellText";
import { useAppBootstrap } from "./useAppBootstrap";
import { useAppShellControllerCallbacks } from "./useAppShellControllerCallbacks";
import { useAppShellStore } from "./useAppShellStore";
import { useRuntimeCinematicBridge } from "./useRuntimeCinematicBridge";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";

export const useAppShellController = () => {
    const bootstrap = useAppBootstrap();
    const shell = useAppShellStore();
    const runtime = useRuntimeStore();
    const executor = useMemo(() => createShellCommandExecutor(), []);
    useRuntimeCinematicBridge();

    useEffect(() => {
        if (
            shell.overlay === "main-menu" ||
            shell.overlay === "new-game" ||
            shell.overlay === "save-menu" ||
            shell.overlay === "load-menu"
        )
            void runtime.fetchSaves();
    }, [runtime, shell.overlay]);

    const runCommand = useCallback(
        async (command: string) => {
            const result = await executor.execute(command);
            if (result.type === "error")
                setShellError(toShellText(result.content));
            return result;
        },
        [executor],
    );

    const continueSaveName = resolveContinueSaveName(
        runtime.availableSaves,
        runtime.currentSaveName,
    );
    const canContinue = shell.hasActiveGameSession || continueSaveName !== null;
    const callbacks = useAppShellControllerCallbacks({
        continueSaveName,
        runCommand,
        runtime,
        shell,
        workspaceManifestPath: bootstrap.workspaceManifestPath ?? undefined,
    });
    const handleNewGameSelection = useCallback(() => {
        if (hasAutosave(runtime.availableSaves)) return shell.openNewGameMenu();
        void callbacks.handleNewGame();
    }, [callbacks, runtime.availableSaves, shell]);

    useEffect(() => {
        if (
            shell.overlay === "cinematic" &&
            shell.cinematicSource === "main-menu" &&
            (shell.cinematicLines ?? MAIN_MENU_CINEMATIC_LINES).length === 0
        )
            void callbacks.handleCinematicComplete();
    }, [callbacks, shell.cinematicLines, shell.cinematicSource, shell.overlay]);

    const statusText = getMainMenuStatusText(bootstrap);
    const errorText = shell.errorText ?? bootstrap.bootstrapError;
    const actions = buildMainMenuActions({
        canStartNewGame:
            !bootstrap.isBootstrapping &&
            Boolean(bootstrap.workspaceManifestPath),
        canContinue,
        continueDescription: shell.hasActiveGameSession
            ? "Return to the active session."
            : "Load the most recent save and continue.",
        menuOrigin: shell.menuOrigin,
        onNewGame: handleNewGameSelection,
        onContinue: () => void callbacks.handleContinue(),
        onSave: () => shell.openSaveMenu(),
        onLoad: () => shell.openLoadMenu(),
        onDevtools: () => {
            setShellError(null);
            toggleEditor(true);
            shell.openDevtools();
        },
    });

    return {
        bootstrap,
        shell,
        runtime,
        statusText,
        errorText,
        actions,
        onOpenMenu: callbacks.onOpenMenu,
        onCinematicComplete: () => void callbacks.handleCinematicComplete(),
        onDialogClose: callbacks.onDialogClose,
        onNewGameBack: callbacks.onNewGameBack,
        onNewGameConfirm: () => void callbacks.handleNewGame(),
        onSaveAs: callbacks.onSaveAs,
        onLoad: callbacks.onLoad,
        onDelete: callbacks.onDelete,
    };
};
