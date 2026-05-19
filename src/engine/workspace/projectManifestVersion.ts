export type ProjectVersionChangeKind = "patch" | "minor";

interface ManifestLike {
    name: string;
    files: string[];
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export const normalizeProjectManifestVersion = (
    version: unknown,
    sourcePath: string,
): string => {
    if (version === undefined) return "0.0.0";
    if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
        throw new Error(`Manifest '${sourcePath}' has invalid version.`);
    }
    return version;
};

export const createProjectManifest = (name: string) => ({
    name: name.trim(),
    version: "0.0.1",
    files: [] as string[],
});

const sameFiles = (left: string[], right: string[]) =>
    left.length === right.length &&
    left.every((file, index) => file === right[index]);

export const classifyManifestChange = (
    previous: ManifestLike,
    next: ManifestLike,
): ProjectVersionChangeKind | null => {
    if (previous.name === next.name && sameFiles(previous.files, next.files)) {
        return null;
    }
    const existing = new Set(previous.files);
    return next.files.some((file) => !existing.has(file)) ? "minor" : "patch";
};

export const bumpProjectVersion = (
    version: string,
    changeKind: ProjectVersionChangeKind,
): string => {
    const [major, minor, patch] = version.split(".").map(Number);
    return changeKind === "minor"
        ? `${major}.${minor + 1}.0`
        : `${major}.${minor}.${patch + 1}`;
};
