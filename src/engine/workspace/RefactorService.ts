import type { WorkspaceService } from "./WorkspaceService";
import type { FileSystem } from "../vfs/FileSystem";
import { stageProjectVersionInVfs } from "./projectVersionPersistence";

const stripExt = (filename: string) => filename.replace(/\.[^/.]+$/, "");

const replaceRefs = (node: unknown, from: string, to: string): unknown => {
    if (typeof node === "string")
        return node.replaceAll(`${from}::`, `${to}::`);
    if (Array.isArray(node))
        return node.map((item) => replaceRefs(item, from, to));
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
    )) {
        out[key] = replaceRefs(value, from, to);
    }
    return out;
};

export class RefactorService {
    constructor(
        private readonly workspace: WorkspaceService,
        private readonly vfs: FileSystem,
    ) {}

    async moveNamespace(
        oldNamespace: string,
        newNamespace: string,
    ): Promise<void> {
        const pending = new Map<string, unknown>();
        const moves: Array<{ from: string; to: string }> = [];

        for (const [
            filename,
            moduleData,
        ] of this.workspace.moduleCache.entries()) {
            const ns = stripExt(filename);
            const nextFile = ns.startsWith(oldNamespace)
                ? filename.replace(oldNamespace, newNamespace)
                : filename;
            if (nextFile !== filename) {
                moves.push({
                    from: this.workspace.resolveProjectFile(filename),
                    to: this.workspace.resolveProjectFile(nextFile),
                });
            }
            const updated = replaceRefs(moduleData, oldNamespace, newNamespace);
            if (JSON.stringify(updated) !== JSON.stringify(moduleData))
                pending.set(nextFile, updated);
        }

        if (moves.length > 0) await this.vfs.movePaths(moves);
        for (const [path, mod] of pending.entries()) {
            await this.workspace.writeModule(path, mod as any);
        }

        const manifestPath = this.workspace.getManifestPath();
        if (manifestPath) {
            const manifest = ((await this.vfs.readFile(manifestPath)) ?? {
                files: [],
            }) as any;
            manifest.files = (manifest.files ?? []).map((file: string) =>
                file.replace(oldNamespace, newNamespace),
            );
            await this.vfs.writeFile(manifestPath, manifest);
            await stageProjectVersionInVfs(this.vfs, manifestPath, "patch");
            await this.workspace.loadProject(manifestPath);
        }
    }
}

