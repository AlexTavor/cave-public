const normalize = (path: string) =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

export const stripProjectPrefix = (path: string, projectName: string) => {
    const normalized = normalize(path);
    const prefix = normalize(projectName);
    return prefix && normalized.startsWith(`${prefix}/`)
        ? normalized.slice(prefix.length + 1)
        : normalized;
};

const unique = (items: string[]) => [...new Set(items.filter(Boolean))];

export const normalizeManifestFiles = (files: string[], projectName: string) =>
    unique(files.map((file) => stripProjectPrefix(file, projectName)));

export const buildAddOptions = (
    scanned: string[],
    manifestFiles: string[],
    projectName: string,
) => {
    const existing = new Set(
        normalizeManifestFiles(manifestFiles, projectName),
    );
    return unique(
        scanned.map((file) => stripProjectPrefix(file, projectName)),
    ).filter((file) => !existing.has(file));
};
