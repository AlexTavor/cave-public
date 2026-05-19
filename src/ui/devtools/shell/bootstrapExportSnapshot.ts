const normalizePath = (path: string): string =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

export const isBootstrapExportFile = (path: string): boolean => {
    const normalized = normalizePath(path);
    return !normalized.startsWith("saves/") && normalized !== "game_data.json";
};

export const filterBootstrapSnapshot = (
    snapshot: Record<string, unknown>,
): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(snapshot).filter(([path]) =>
            isBootstrapExportFile(path),
        ),
    );
