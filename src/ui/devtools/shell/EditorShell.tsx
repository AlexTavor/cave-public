import { WindowManager } from "./WindowManager";
import { LayoutGhostLayer } from "./overlays/LayoutGhostLayer.tsx";
import { LayoutEditor } from "../layout/LayoutEditor";
import { TextsEditor } from "../texts/TextsEditor";
import { useShellStore } from "./shell";
import { ToastViewport } from "../toast/ToastViewport";
import { Portal } from "../../lib/foundation/portal-manager/Portal";
import { useSyncActiveTabToShellPath } from "./hooks/useSyncActiveTabToShellPath";
import { useRestoreProject } from "./hooks/useRestoreProject";
import { useEnsureModuleSession } from "../state/moduleSession";
import { isModuleSessionFilename } from "../state/moduleSession/isModuleSessionFilename";
import { DevtoolsLoadingScreen } from "./DevtoolsLoadingScreen";

export const EditorShell = () => {
    useSyncActiveTabToShellPath();
    useRestoreProject();
    const activeModuleFilename = useShellStore((s) => s.activeModuleFilename);
    const isLayoutMode = useShellStore((s) => s.isLayoutMode);
    const layoutTargetFilename = useShellStore((s) => s.layoutTargetFilename);
    const isTextsMode = useShellStore((s) => s.isTextsMode);
    const textsTargetManifestPath = useShellStore(
        (s) => s.textsTargetManifestPath,
    );
    const shouldLoadSession = isModuleSessionFilename(activeModuleFilename);
    const session = useEnsureModuleSession(activeModuleFilename);

    if (shouldLoadSession && session.isInitializing && !session.isReady) {
        return <DevtoolsLoadingScreen />;
    }

    if (isLayoutMode && layoutTargetFilename) {
        return (
            <>
                <LayoutEditor manifestPath={layoutTargetFilename} />
                <Portal layer="toast">
                    <ToastViewport />
                </Portal>
            </>
        );
    }

    if (isTextsMode && textsTargetManifestPath) {
        return (
            <>
                <TextsEditor manifestPath={textsTargetManifestPath} />
                <Portal layer="toast">
                    <ToastViewport />
                </Portal>
            </>
        );
    }

    return (
        <>
            <WindowManager />
            <LayoutGhostLayer />
            <Portal layer="toast">
                <ToastViewport />
            </Portal>
        </>
    );
};

