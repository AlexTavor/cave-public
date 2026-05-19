const normalizePath = (path: string): string =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

export const isExportableVfsFile = (path: string): boolean =>
    !normalizePath(path).startsWith("saves/");
