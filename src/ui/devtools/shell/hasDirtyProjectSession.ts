import { workspaceService } from "../../../engine/terminal/commands/projectServices";

export const hasDirtyProjectSession = (
    sessions: Record<string, { isDirty?: boolean } | undefined>,
    activeManifestPath: string | null,
) => {
    const inActiveProject =
        activeManifestPath &&
        workspaceService.getManifestPath() === activeManifestPath
            ? new Set(workspaceService.moduleCache.keys())
            : null;

    return Object.entries(sessions).some(
        ([filename, session]) =>
            Boolean(session?.isDirty) &&
            (!inActiveProject || inActiveProject.has(filename)),
    );
};
