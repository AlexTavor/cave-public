import { useShellStore } from "./shell";
import {
    useModuleSession,
    useEnsureModuleSession,
} from "../state/moduleSession";
import { useSessionStore } from "../state/useSessionStore";
import { useToastStore } from "../toast/toastStore";
import { isModuleSessionFilename } from "../state/moduleSession/isModuleSessionFilename";
import { useGlobalEditorToolbarActions } from "./useGlobalEditorToolbarActions";
import { type GlobalEditorToolbarViewModel } from "./useGlobalEditorToolbar.types";
import { useUnifiedUndo } from "../state/useUnifiedUndo";
import { resolveToolbarStatus } from "./toolbarStatus";
import { useAppShellStore } from "../../../app-shell/useAppShellStore";
import { hasDirtyProjectSession } from "./hasDirtyProjectSession";

export const useGlobalEditorToolbar =
    (): GlobalEditorToolbarViewModel | null => {
        const activeModuleFilename = useShellStore(
            (s) => s.activeModuleFilename,
        );
        const moduleFilename = isModuleSessionFilename(activeModuleFilename)
            ? activeModuleFilename
            : null;
        const activeFilePath = useShellStore((s) => s.activeFilePath);
        const activeManifestPath = useShellStore((s) => s.activeManifestPath);
        const isLayoutMode = useShellStore((s) => s.isLayoutMode);
        const isTextsMode = useShellStore((s) => s.isTextsMode);
        const log = useShellStore((s) => s.log);
        const toggleEditor = useShellStore((s) => s.toggleEditor);
        const toggleLayoutMode = useShellStore((s) => s.toggleLayoutMode);
        const toggleTextsMode = useShellStore((s) => s.toggleTextsMode);
        const hasDirtySession = useSessionStore((state) =>
            hasDirtyProjectSession(state.sessions, activeManifestPath),
        );
        const openMainMenuFromDevtools = useAppShellStore(
            (s) => s.openMainMenuFromDevtools,
        );
        const pushToast = useToastStore((s) => s.push);

        const { isReady, isDirty, save } = useModuleSession(moduleFilename);
        const toolbarActions = useGlobalEditorToolbarActions({
            moduleFilename,
            activeFilePath,
            save,
            log,
            pushToast,
        });
        const {
            canUndo: unifiedCanUndo,
            canRedo: unifiedCanRedo,
            isBusy,
            undo: unifiedUndo,
            redo: unifiedRedo,
        } = useUnifiedUndo();
        useEnsureModuleSession(moduleFilename);

        if (!moduleFilename && !activeFilePath) {
            return null;
        }

        const { statusVariant, statusLabel } = resolveToolbarStatus(
            !moduleFilename,
            isReady,
            isDirty,
        );

        const disableUndo = !unifiedCanUndo || isBusy;
        const disableRedo = !unifiedCanRedo || isBusy;
        const disableSave =
            toolbarActions.isSaving || toolbarActions.isCompiling;
        const disableCompile =
            disableSave || toolbarActions.isExportingBootstrap;
        const disableExportBootstrap =
            disableSave || toolbarActions.isExportingBootstrap;
        const disablePhysics = !activeManifestPath || isLayoutMode;
        const disableTexts =
            !activeManifestPath ||
            isLayoutMode ||
            isTextsMode ||
            hasDirtySession;

        return {
            filename: moduleFilename ?? activeFilePath ?? "project",
            activeFilePath,
            statusVariant,
            statusLabel,
            isSaving: toolbarActions.isSaving,
            isCompiling: toolbarActions.isCompiling,
            isExportingBootstrap: toolbarActions.isExportingBootstrap,
            disableUndo,
            disableRedo,
            disableSave,
            disableCompile,
            disableExportBootstrap,
            disablePhysics,
            disableTexts,
            handleMenu: () => {
                toggleEditor(false);
                openMainMenuFromDevtools();
            },
            undo: () => void unifiedUndo(),
            redo: () => void unifiedRedo(),
            handleTexts: () => {
                if (activeManifestPath)
                    toggleTextsMode(true, activeManifestPath);
            },
            handlePhysics: () => {
                if (activeManifestPath) {
                    void toolbarActions.handleSave().finally(() => {
                        toggleLayoutMode(true, activeManifestPath);
                    });
                }
            },
            handleSave: toolbarActions.handleSave,
            handleCompile: toolbarActions.handleCompile,
            handleExportBootstrap: toolbarActions.handleExportBootstrap,
        };
    };

