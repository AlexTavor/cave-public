import { vfs } from "../engine/vfs/FileSystem";

const isManifestPath = (path: string) =>
    path === "manifest.json" || path.endsWith("/manifest.json");

export const resolveManifestPathFromPaths = (
    paths: string[],
): string | null => {
    const manifests = paths.filter(isManifestPath);
    if (manifests.includes("manifest.json")) return "manifest.json";
    return manifests[0] ?? null;
};

export const resolveWorkspaceManifestPath = async (): Promise<
    string | null
> => {
    if (typeof vfs.listFiles === "function") {
        return resolveManifestPathFromPaths(await vfs.listFiles());
    }
    return (await vfs.readFile("manifest.json")) === null
        ? null
        : "manifest.json";
};
