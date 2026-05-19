import type { ModuleCartridge } from "../../../data/schemas/module";
import { vfs } from "../../../engine/vfs/FileSystem";
import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { saveModuleWithVersionBump } from "../utils/modulePersistence";
import {
    parseNonSemanticModule,
    readSemanticModule,
    saveSemanticModule,
} from "../../../lib/modules/semanticModuleIo";
import { readProjectManifest } from "../../../engine/workspace/projectManifest";
import { applyProjectVersionStage } from "../../../engine/workspace/projectVersionStage";
import {
    isManifestListedProjectFile,
    persistAndClearProjectVersion,
} from "../../../engine/workspace/projectVersionPersistence";

export interface ModuleStoreIO {
    readModule: (filename: string) => Promise<ModuleCartridge | null>;
    saveModule: (
        filename: string,
        moduleData: ModuleCartridge,
    ) => Promise<ModuleCartridge>;
}

export function createDefaultModuleStoreIO(): ModuleStoreIO {
    const resolvePath = async (filename: string) => {
        const files = await vfs.listFiles();
        const normalized = filename.replaceAll("\\", "/").replace(/^\/+/, "");
        const exact = files.find((f) => f === normalized);
        if (exact) return exact;
        return (
            files.find((f) =>
                f.replaceAll("\\", "/").endsWith(`/${normalized}`),
            ) ?? filename
        );
    };

    const saveWithoutBump = async (path: string, data: unknown) => {
        await vfs.writeFile(path, data as never);
        if (import.meta.env.MODE !== "test") {
            await vfs.saveToDisk(path);
        }
    };

    const readRaw = async (path: string) => {
        const data = await (vfs as any).readFile(path);
        if (data != null) return data;
        if (typeof (vfs as any).readText === "function") {
            return await (vfs as any).readText(path);
        }
        return null;
    };

    const persistProjectVersion = async (path: string) => {
        const manifestPath = workspaceService.getManifestPath();
        if (!manifestPath) return;
        const manifest = await readProjectManifest(vfs, manifestPath);
        if (!isManifestListedProjectFile(manifestPath, manifest, path)) return;
        const applied = applyProjectVersionStage(
            manifestPath,
            manifest,
            "patch",
        );
        if (applied.versionChanged) {
            await vfs.writeFile(manifestPath, applied.manifest as never);
        }
        await persistAndClearProjectVersion(vfs, manifestPath);
    };

    return {
        readModule: async (filename) => {
            const path = await resolvePath(filename);
            const raw = await readRaw(path);
            if (raw == null) return null;
            const semantic = readSemanticModule(filename, raw);
            if (semantic) return semantic;
            return parseNonSemanticModule(raw);
        },
        saveModule: async (filename, moduleData) => {
            const path = await resolvePath(filename);
            const semanticPayload = saveSemanticModule(
                path,
                filename,
                moduleData,
            );
            if (semanticPayload != null) {
                await saveWithoutBump(path, semanticPayload);
                await persistProjectVersion(path);
                return moduleData;
            }
            const saved = await saveModuleWithVersionBump(path, moduleData);
            await persistProjectVersion(path);
            return saved;
        },
    };
}

