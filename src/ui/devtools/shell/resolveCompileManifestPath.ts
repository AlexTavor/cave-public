import { vfs } from "../../../engine/vfs/FileSystem";
import { parseVirtualPath } from "./window-manager/virtualPath";

const normalize = (path: string) =>
    path.replaceAll("\\", "/").replace(/^\/+/, "");

const candidatesFromFile = (filename: string): string[] => {
    const normalized = normalize(filename);
    if (!normalized) return [];
    if (normalized.endsWith("manifest.json")) return [normalized];
    const parts = normalized.split("/");
    const out: string[] = [];
    for (let i = parts.length - 1; i >= 1; i -= 1) {
        const dir = parts.slice(0, i).join("/");
        out.push(`${dir}/manifest.json`);
    }
    out.push("manifest.json");
    return out;
};

export const resolveCompileManifestPath = async (params: {
    activeModuleFilename: string | null;
    activeFilePath: string | null;
    workspaceManifestPath: string | null;
}): Promise<string | null> => {
    if (params.workspaceManifestPath) return params.workspaceManifestPath;

    const files = (await vfs.listFiles()).map(normalize);
    const fileSet = new Set(files);

    const parsedFilename = params.activeFilePath
        ? parseVirtualPath(params.activeFilePath).filename
        : "";

    const seeds = [params.activeModuleFilename, parsedFilename].filter(
        (v): v is string => Boolean(v),
    );

    for (const seed of seeds) {
        for (const candidate of candidatesFromFile(seed)) {
            if (fileSet.has(candidate)) return candidate;
        }
    }

    const manifests = files.filter(
        (f) => f.endsWith("/manifest.json") || f === "manifest.json",
    );
    return manifests.length === 1 ? manifests[0] : null;
};
