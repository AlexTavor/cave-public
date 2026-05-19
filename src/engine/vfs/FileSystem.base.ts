import { IndexedDBPersistence } from "./IndexedDBPersistence";
import type { ModuleCartridge } from "../../data/schemas/module";
import { assertValidBootstrapSnapshot, getDiskWritePath } from "./bootstrap";
import type { FetchLike, PersistenceAdapter } from "./persistence";
import { fetchDiskData, postJsonToEditor } from "./fileSystemBaseDisk";
import { hydrateLoadedCartridge } from "./fileSystemBaseInit";

export class FileSystemBase {
    protected readonly db: PersistenceAdapter<ModuleCartridge>;
    protected readonly fetcher: FetchLike<ModuleCartridge>;
    protected readonly isDev: boolean;
    private readonly isDefaultFetcher: boolean;
    private readonly loadedCartridge: string;
    private readonly sourcePath: string;
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    constructor(params?: {
        db?: PersistenceAdapter<ModuleCartridge>;
        fetcher?: FetchLike<ModuleCartridge>;
        isDev?: boolean;
        fatFile?: string;
        sourcePath?: string;
    }) {
        this.db = params?.db ?? new IndexedDBPersistence<ModuleCartridge>();
        this.fetcher = params?.fetcher ?? globalThis.fetch.bind(globalThis);
        this.isDefaultFetcher = !params?.fetcher;
        this.isDev = params?.isDev ?? import.meta.env.DEV;
        this.loadedCartridge = params?.fatFile ?? "game_data.json";
        this.sourcePath = params?.sourcePath ?? "src/data/raw";
    }
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        this.initPromise ??= (async () => {
            const diskRaw = await fetchDiskData({
                fetcher: this.fetcher,
                filename: this.loadedCartridge,
                isDefaultFetcher: this.isDefaultFetcher,
                isDev: this.isDev,
                loadedCartridge: this.loadedCartridge,
                sourcePath: this.sourcePath,
            });
            const diskData = typeof diskRaw === "string" ? null : diskRaw;
            await hydrateLoadedCartridge(
                this.db,
                this.loadedCartridge,
                diskData,
            );
            this.isInitialized = true;
        })();
        return this.initPromise;
    }

    public async readFile(path: string): Promise<ModuleCartridge | null> {
        await this.init();
        const fromDb = await this.db.load(path);
        if (fromDb !== undefined && typeof fromDb !== "string") return fromDb;
        const fromDisk = await fetchDiskData({
            fetcher: this.fetcher,
            filename: path,
            isDefaultFetcher: this.isDefaultFetcher,
            isDev: this.isDev,
            loadedCartridge: this.loadedCartridge,
            sourcePath: this.sourcePath,
        });
        return !fromDisk || typeof fromDisk === "string" ? null : fromDisk;
    }

    public async readText(path: string): Promise<string | null> {
        await this.init();
        const fromDb = await this.db.load(path);
        if (typeof fromDb === "string") return fromDb;
        const fromDisk = await fetchDiskData({
            fetcher: this.fetcher,
            filename: path,
            isDefaultFetcher: this.isDefaultFetcher,
            isDev: this.isDev,
            loadedCartridge: this.loadedCartridge,
            sourcePath: this.sourcePath,
        });
        return typeof fromDisk === "string" ? fromDisk : null;
    }

    public async writeFile(path: string, data: ModuleCartridge): Promise<void> {
        await this.init();
        await this.db.save(path, data);
    }

    public async saveToDisk(filename: string): Promise<void> {
        await this.init();
        const data = await this.db.load(filename);
        if (!data) throw new Error(`File '${filename}' not found in VFS.`);
        await this.saveJsonToDisk(
            getDiskWritePath({ sourceDir: this.sourcePath, filename }),
            data,
        );
    }

    public async exportState(): Promise<Record<string, unknown>> {
        await this.init();
        if (!this.db.exportAll)
            throw new Error("Bulk VFS export is not supported.");
        return this.db.exportAll();
    }

    public async importState(data: Record<string, unknown>): Promise<void> {
        await this.init();
        if (!this.db.importAll)
            throw new Error("Bulk VFS import is not supported.");
        await this.db.importAll(assertValidBootstrapSnapshot(data));
    }

    public async saveJsonToDisk(
        path: string,
        content: Record<string, unknown>,
    ) {
        await postJsonToEditor(this.fetcher, path, content);
    }

    public async listFiles(): Promise<string[]> {
        await this.init();
        return this.db.getAllKeys();
    }

    public async deleteFile(path: string): Promise<void> {
        await this.init();
        await this.db.delete(path);
    }
}

