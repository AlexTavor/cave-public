import { normalizeProjectManifestVersion } from "./projectManifestVersion";
import type { ModuleCartridge } from "./projectModuleParsing";
import {
    formatProjectModuleParseError,
    parseProjectModuleFile,
} from "./projectModuleParsing";

export interface ProjectManifest {
    name: string;
    version: string;
    files: string[];
}

const readTextIfAvailable = async (vfs: unknown, path: string) => {
    if (typeof (vfs as any).readText !== "function") return null;
    return (vfs as any).readText(path);
};

const readRawFile = async (vfs: unknown, path: string) => {
    const fromObject = await (vfs as any).readFile(path);
    if (fromObject != null) return fromObject;
    return await readTextIfAvailable(vfs, path);
};

export const parseProjectManifest = (
    raw: unknown,
    sourcePath: string,
): ProjectManifest => {
    if (!raw || typeof raw !== "object")
        throw new Error(`Invalid manifest at '${sourcePath}'.`);
    const manifest = raw as {
        name?: unknown;
        version?: unknown;
        files?: unknown;
    };
    if (
        typeof manifest.name !== "string" ||
        manifest.name.trim().length === 0
    ) {
        throw new Error(
            `Manifest '${sourcePath}' must include a non-empty name.`,
        );
    }
    if (
        !Array.isArray(manifest.files) ||
        manifest.files.some((f) => typeof f !== "string")
    ) {
        throw new Error(
            `Manifest '${sourcePath}' must include a string[] files list.`,
        );
    }
    return {
        name: manifest.name.trim(),
        version: normalizeProjectManifestVersion(manifest.version, sourcePath),
        files: manifest.files,
    };
};

export const readProjectManifest = async (
    vfs: unknown,
    path: string,
): Promise<ProjectManifest> => {
    const fromObject = await (vfs as any).readFile(path);
    if (fromObject != null) return parseProjectManifest(fromObject, path);
    const fromText = await readTextIfAvailable(vfs, path);
    if (!fromText) throw new Error(`Manifest '${path}' not found.`);
    return parseProjectManifest(JSON.parse(fromText), path);
};

export {
    bumpProjectVersion,
    classifyManifestChange,
    createProjectManifest,
} from "./projectManifestVersion";
export type { ProjectVersionChangeKind } from "./projectManifestVersion";

export const assertValidProjectModules = async (
    vfs: unknown,
    root: string,
    files: string[],
): Promise<Record<string, ModuleCartridge>> => {
    const modules: Record<string, ModuleCartridge> = {};

    for (const file of files) {
        const path = `${root}/${file}`;
        const raw = await readRawFile(vfs, path);
        if (raw == null)
            throw new Error(`Project module '${path}' is missing.`);
        let module: ModuleCartridge | null = null;
        try {
            module = parseProjectModuleFile(file, raw);
        } catch (error: unknown) {
            throw new Error(formatProjectModuleParseError(path, error));
        }
        if (module) modules[file] = module;
    }
    return modules;
};

