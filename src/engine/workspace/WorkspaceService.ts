import { Runtime } from "../runtime/Runtime";
import { CommandsManager } from "../runtime/CommandsManager";
import type { RuntimeCartridge } from "../linker/types";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { FileSystem } from "../vfs/FileSystem";
import type { ModuleLinker } from "../linker/ModuleLinker";
import { saveSemanticModule } from "../../lib/modules/semanticModuleIo";
import {
    assertValidProjectModules,
    createProjectManifest,
    readProjectManifest,
} from "./projectManifest";

export class WorkspaceService {
    public activeRuntime: Runtime | null = null;
    public activeCartridge: RuntimeCartridge | null = null;
    public readonly moduleCache: Map<string, ModuleCartridge> = new Map();
    private manifestPath: string | null = null;
    private projectRoot: string | null = null;

    constructor(
        private readonly vfs: FileSystem,
        private readonly linker: ModuleLinker,
    ) {}

    async createProject(path: string, name: string): Promise<void> {
        const normalized = path.replace(/\/+$/, "");
        await this.vfs.writeFile(
            `${normalized}/manifest.json`,
            createProjectManifest(name) as any,
        );
        await this.loadProject(`${normalized}/manifest.json`);
    }

    async loadProject(manifestPath: string): Promise<void> {
        const manifest = await readProjectManifest(this.vfs, manifestPath);
        this.manifestPath = manifestPath;
        const root = manifestPath.replace(/\/manifest\.json$/, "");
        this.projectRoot = root;
        const modules = await assertValidProjectModules(
            this.vfs,
            root,
            manifest.files,
        );
        this.moduleCache.clear();
        Object.entries(modules).forEach(([file, mod]) => {
            this.moduleCache.set(file, mod);
        });
        this.activeCartridge = await this.linker.linkProject(root);
        this.replaceRuntime();
    }

    async closeProject(): Promise<void> {
        this.activeRuntime?.destroy();
        this.activeRuntime = null;
        this.activeCartridge = null;
        this.moduleCache.clear();
        this.manifestPath = null;
        this.projectRoot = null;
    }

    getSymbols(): string[] {
        return Object.keys(this.activeCartridge?.blueprints ?? {});
    }

    getManifestPath(): string | null {
        return this.manifestPath;
    }

    resolveProjectFile(filename: string): string {
        if (!this.projectRoot || filename.startsWith(`${this.projectRoot}/`))
            return filename;
        return `${this.projectRoot}/${filename}`;
    }

    async writeModule(
        filename: string,
        moduleData: ModuleCartridge,
    ): Promise<void> {
        const path = this.resolveProjectFile(filename);
        const payload = saveSemanticModule(path, filename, moduleData);
        await this.vfs.writeFile(path, (payload ?? moduleData) as any);
        this.moduleCache.set(filename, moduleData);
    }

    async reloadModules(filenames: string[]): Promise<void> {
        const root = this.manifestPath?.replace(/\/manifest\.json$/, "");
        if (!this.manifestPath || !root) return;
        for (const filename of filenames) {
            const mod = await this.vfs.readFile(`${root}/${filename}`);
            if (mod) this.moduleCache.set(filename, mod);
        }
        this.activeCartridge = await this.linker.linkProject(root);
        this.replaceRuntime();
    }

    private replaceRuntime(): void {
        const first = Array.from(this.moduleCache.values())[0];
        if (!first) {
            this.activeRuntime = null;
            return;
        }
        this.activeRuntime?.destroy();
        this.activeRuntime = new Runtime(
            first,
            "workspace",
            new CommandsManager(),
        );
    }
}

