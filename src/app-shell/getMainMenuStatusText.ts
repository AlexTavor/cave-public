interface StatusTextParams {
    isBootstrapping: boolean;
    bootstrapError: string | null;
    workspaceManifestPath: string | null;
}

export const getMainMenuStatusText = ({
    isBootstrapping,
    bootstrapError,
    workspaceManifestPath,
}: StatusTextParams): string => {
    if (isBootstrapping) return "Bootstrapping workspace...";
    if (bootstrapError) return "Bootstrap failed.";
    return workspaceManifestPath
        ? "Workspace ready."
        : "Workspace unavailable.";
};
