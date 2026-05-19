/// <reference types="vite/types/importMeta.d.ts" />

import { vfs } from "../vfs/FileSystem";

// --- File System Cache (Sync Support) ---
// We maintain a local cache of filenames to support synchronous autocomplete
// which is required by the terminal architecture.
export const fileCache: string[] = [];
const allPathCache: string[] = [];
export const DIR_MARKER_FILENAME = ".cave-dir";

const diskFilePaths = Object.keys(
    import.meta.glob("/src/data/raw/*", { eager: true }),
);
const isNonEmptyString = (value: string | undefined): value is string =>
    typeof value === "string" && value.length > 0;

const diskFiles = diskFilePaths
    .map((path) => path.split("/").pop())
    .filter(isNonEmptyString);

export const refreshFileCache = () => {
    vfs.listFiles()
        .then((files) => {
            fileCache.length = 0;
            allPathCache.length = 0;
            const merged = new Set([...files, ...diskFiles]);
            allPathCache.push(
                ...Array.from(merged).sort((a, b) => a.localeCompare(b)),
            );
            fileCache.push(
                ...allPathCache
                    .filter((path) => !path.endsWith(`/${DIR_MARKER_FILENAME}`))
                    .sort((a, b) => a.localeCompare(b)),
            );
        })
        .catch(() => {
            // Silent failure for autocomplete cache
        });
};

// Initialize cache on load
refreshFileCache();

// --- Helper for Autocomplete ---
export const getFileSuggestions = (args: string[]) => {
    if (args.length === 1) {
        const token = args[0].toLowerCase();
        return fileCache
            .filter((f) => f.toLowerCase().startsWith(token))
            .map((f) => ({
                label: f,
                type: "value" as const,
                insertText: f,
            }));
    }
    return [];
};

const getDirectoryCandidates = (): string[] => {
    const dirs = new Set<string>(["./"]);
    for (const file of allPathCache) {
        if (file.endsWith(`/${DIR_MARKER_FILENAME}`)) {
            const markerSuffix = `/${DIR_MARKER_FILENAME}`;
            dirs.add(`${file.slice(0, -markerSuffix.length)}/`);
        }
        const segments = file.split("/");
        for (let i = 1; i < segments.length; i += 1) {
            dirs.add(`${segments.slice(0, i).join("/")}/`);
        }
    }
    return Array.from(dirs).sort((a, b) => a.localeCompare(b));
};

export const getPathSuggestions = (token: string, includeFiles = true) => {
    const normalized = token.toLowerCase() === "." ? "./" : token.toLowerCase();
    const paths = includeFiles
        ? [...fileCache, ...getDirectoryCandidates()]
        : getDirectoryCandidates();
    const unique = Array.from(new Set(paths));
    unique.sort((a, b) => a.localeCompare(b));
    return unique
        .filter((path) => path.toLowerCase().startsWith(normalized))
        .map((path) => ({
            label: path,
            type: "value" as const,
            insertText: path,
        }));
};

