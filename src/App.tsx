import { AppRoot } from "./App.styles";
import { UiRoot } from "./ui/shell/UiRoot";
import { useAppShellController } from "./app-shell/useAppShellController";
import { useShellHotkeys } from "./app-shell/useShellHotkeys";
import { useRuntimeAutosave } from "./app-shell/useRuntimeAutosave";
import { AppMenuOverlays } from "./app-shell/AppMenuOverlays";
import { AppRuntimeLayers } from "./app-shell/AppRuntimeLayers";
import { AppSecondaryOverlays } from "./app-shell/AppSecondaryOverlays";
import { buildAppViewState } from "./app-shell/buildAppViewState";
import { useEffect } from "react";

function App() {
    useEffect(() => {
        // PERFORMANCE FIX: Clear performance measures every frame to prevent memory leak
        let frameId: number;

        const cleanupLoop = () => {
            // Check if buffer is getting full (arbitrary threshold like 100 entries)
            if (performance.getEntriesByType("measure").length > 100) {
                performance.clearMeasures();
                performance.clearMarks(); // Optional: clear marks too if they are accumulating
            }
            frameId = requestAnimationFrame(cleanupLoop);
        };

        frameId = requestAnimationFrame(cleanupLoop);

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, []);

    const controller = useAppShellController();
    useShellHotkeys();
    useRuntimeAutosave();
    const view = buildAppViewState(controller.shell);

    return (
        <AppRoot>
            <UiRoot>
                <AppRuntimeLayers
                    chrome={view.chrome}
                    menuVisible={view.menuVisible}
                    menuButtonVisible={view.menuButtonVisible}
                    manifestPath={controller.bootstrap.workspaceManifestPath}
                    onOpenMenu={controller.onOpenMenu}
                />
                <AppMenuOverlays
                    menuVisible={view.menuVisible}
                    showNewGameOverlay={view.showNewGameOverlay}
                    actions={controller.actions}
                    errorText={controller.errorText}
                    statusText={controller.statusText}
                    onNewGameBack={controller.onNewGameBack}
                    onNewGameConfirm={controller.onNewGameConfirm}
                />
                <AppSecondaryOverlays
                    showSaveLoadOverlay={view.showSaveLoadOverlay}
                    showCinematicOverlay={view.showCinematicOverlay}
                    showEditorOverlay={view.showEditorOverlay}
                    saveLoadMode={
                        controller.shell.overlay === "save-menu"
                            ? "save"
                            : "load"
                    }
                    availableSaves={controller.runtime.availableSaves}
                    canSave={controller.runtime.runtime !== null}
                    cinematicLines={controller.shell.cinematicLines ?? []}
                    currentSaveName={controller.runtime.currentSaveName}
                    onDialogClose={controller.onDialogClose}
                    onDelete={controller.onDelete}
                    onLoad={controller.onLoad}
                    onSaveAs={controller.onSaveAs}
                    onCinematicComplete={controller.onCinematicComplete}
                />
            </UiRoot>
        </AppRoot>
    );
}

export default App;

