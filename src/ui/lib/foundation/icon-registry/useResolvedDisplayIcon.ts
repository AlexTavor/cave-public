import { useMemo } from "react";
import { workspaceService } from "../../../../engine/terminal/commands/projectServices";
import { useShellStore } from "../../../devtools/shell/shell";
import { useModuleStore } from "../../../devtools/state/moduleStore";
import { useSessionStore } from "../../../devtools/state/useSessionStore";
import { useRuntimeStore } from "../../../runtime/state/useRuntimeStore";
import { useDisplayImageUrl } from "../../../runtime/world/display-images/useDisplayImageUrl";
import { buildDisplayImageRequest } from "../../../../engine/phaser/display-export/buildDisplayImageRequest";

export const useResolvedDisplayIcon = (displayKey: string) => {
    const activeManifestPath = useShellStore(
        (state) => state.activeManifestPath,
    );
    const activeModuleFilename = useShellStore(
        (state) => state.activeModuleFilename,
    );
    const modules = useModuleStore((state) => state.modules);
    const sessions = useSessionStore((state) => state.sessions);
    const runtime = useRuntimeStore((state) => state.runtime);
    const linkedCartridge = activeManifestPath
        ? workspaceService.activeCartridge
        : null;
    const runtimeCartridge = runtime?.getCartridge() ?? null;
    const sessionDrafts = useMemo(
        () => Object.values(sessions).flatMap((session) => session.draft ?? []),
        [sessions],
    );
    const activeSession = useMemo(
        () =>
            activeModuleFilename
                ? (sessions[activeModuleFilename]?.draft ?? null)
                : null,
        [activeModuleFilename, sessions],
    );
    const request = useMemo(() => {
        try {
            return buildDisplayImageRequest({
                displayKey,
                sources: [
                    activeSession,
                    ...sessionDrafts.filter((draft) => draft !== activeSession),
                    linkedCartridge,
                    runtimeCartridge,
                    activeModuleFilename ? modules[activeModuleFilename] : null,
                    ...Object.entries(modules)
                        .filter(
                            ([filename]) => filename !== activeModuleFilename,
                        )
                        .map(([, moduleData]) => moduleData),
                ],
            });
        } catch {
            return null;
        }
    }, [
        activeManifestPath,
        activeModuleFilename,
        activeSession,
        displayKey,
        linkedCartridge,
        modules,
        runtimeCartridge,
        sessionDrafts,
    ]);
    const exportState = useDisplayImageUrl(request);
    return { ...exportState, request };
};
