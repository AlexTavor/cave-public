import { Cinematic } from "../ui/runtime/cinematic/Cinematic";
import { SaveMenuDialog } from "../ui/production/save-menu/SaveMenuDialog";
import { EditorShell } from "../ui/devtools/shell/EditorShell";
import { AppFadeLayer } from "./AppFadeLayer";

interface AppSecondaryOverlaysProps {
    showSaveLoadOverlay: boolean;
    showCinematicOverlay: boolean;
    showEditorOverlay: boolean;
    saveLoadMode: "save" | "load";
    availableSaves: string[];
    canSave: boolean;
    cinematicLines: string[];
    currentSaveName: string | null;
    onDialogClose: () => void;
    onDelete: (name: string) => Promise<void> | void;
    onLoad: (name: string) => Promise<void> | void;
    onSaveAs: (name: string) => Promise<void> | void;
    onCinematicComplete: () => void;
}

export const AppSecondaryOverlays = ({
    showSaveLoadOverlay,
    showCinematicOverlay,
    showEditorOverlay,
    saveLoadMode,
    availableSaves,
    canSave,
    cinematicLines,
    currentSaveName,
    onDialogClose,
    onDelete,
    onLoad,
    onSaveAs,
    onCinematicComplete,
}: Readonly<AppSecondaryOverlaysProps>) => (
    <>
        <AppFadeLayer
            visible={showSaveLoadOverlay}
            animationKey="save-load-overlay"
            testId="save-load-overlay"
            layer="overlay"
            interactive
        >
            <SaveMenuDialog
                isOpen
                mode={saveLoadMode}
                availableSaves={availableSaves}
                canSave={canSave}
                currentSaveName={currentSaveName}
                onClose={onDialogClose}
                onDelete={onDelete}
                onLoad={onLoad}
                onSaveAs={onSaveAs}
            />
        </AppFadeLayer>
        <AppFadeLayer
            visible={showCinematicOverlay}
            animationKey="cinematic-overlay"
            testId="cinematic-overlay"
            layer="overlay"
            interactive
        >
            <Cinematic
                cinematics={cinematicLines}
                onComplete={onCinematicComplete}
            />
        </AppFadeLayer>
        <AppFadeLayer
            visible={showEditorOverlay}
            animationKey="editor-overlay"
            testId="editor-overlay"
            layer="overlay"
            interactive
        >
            <EditorShell />
        </AppFadeLayer>
    </>
);
