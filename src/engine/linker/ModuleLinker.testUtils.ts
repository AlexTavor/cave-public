import { ModuleLinker } from "./ModuleLinker";

export const json = JSON.stringify;

export const makeTextLinker = (
    files: Record<string, string>,
    warnings?: string[],
) =>
    new ModuleLinker(
        { readText: async (path) => files[path] ?? null },
        {
            warn: (value) => warnings?.push(value),
            debug: () => undefined,
        },
    );

export const makeMixedLinker = (
    textFiles: Record<string, string>,
    objectFiles: Record<string, unknown>,
) =>
    new ModuleLinker({
        readText: async (path) => textFiles[path] ?? null,
        readFile: async (path) => objectFiles[path] ?? null,
    });
