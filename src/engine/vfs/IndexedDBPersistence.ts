import { openDB, type IDBPDatabase } from "idb";
import { assertValidBootstrapSnapshot } from "./bootstrap";
import {
    deleteMany,
    getTree,
    moveMany,
    scan,
    type IndexedDbSchema,
} from "./indexedDbBatch";
import type { MoveItem, TreeNode } from "./types";

const DB_NAME = "cave-game-os";
const STORE_NAME = "files" as const;
const LATEST_VERSION = 1;

export class IndexedDBPersistence<SaveData> {
    private dbPromise: Promise<IDBPDatabase<IndexedDbSchema<SaveData>>> | null =
        null;

    private async getDb(): Promise<IDBPDatabase<IndexedDbSchema<SaveData>>> {
        if (globalThis.indexedDB == null)
            throw new Error("IndexedDB is not available in this environment");
        this.dbPromise ??= openDB<IndexedDbSchema<SaveData>>(
            DB_NAME,
            LATEST_VERSION,
            {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME))
                        db.createObjectStore(STORE_NAME);
                },
            },
        );
        return this.dbPromise;
    }

    public async save(path: string, data: SaveData): Promise<void> {
        await (await this.getDb()).put(STORE_NAME, data, path);
    }

    public async load(path: string): Promise<SaveData | undefined> {
        return (await this.getDb()).get(STORE_NAME, path);
    }

    public async delete(path: string): Promise<void> {
        await (await this.getDb()).delete(STORE_NAME, path);
    }

    public async getAllKeys(): Promise<string[]> {
        const keys = await (await this.getDb()).getAllKeys(STORE_NAME);
        return keys.map(String).sort((a, b) => a.localeCompare(b));
    }

    public async clearAll(): Promise<void> {
        await (await this.getDb()).clear(STORE_NAME);
    }

    public async exportAll(): Promise<Record<string, unknown>> {
        const db = await this.getDb();
        const keys = (await db.getAllKeys(STORE_NAME))
            .map(String)
            .sort((a, b) => a.localeCompare(b));
        const entries = await Promise.all(
            keys.map(async (key) => [key, await db.get(STORE_NAME, key)]),
        );
        return Object.fromEntries(
            entries.filter(([, value]) => value !== undefined),
        );
    }

    public async importAll(data: Record<string, unknown>): Promise<void> {
        const snapshot = assertValidBootstrapSnapshot(data);
        const db = await this.getDb();
        const tx = db.transaction(STORE_NAME, "readwrite");
        await tx.objectStore(STORE_NAME).clear();
        for (const key of Object.keys(snapshot).sort((a, b) =>
            a.localeCompare(b),
        )) {
            await tx
                .objectStore(STORE_NAME)
                .put(snapshot[key] as SaveData, key);
        }
        await tx.done;
    }

    public async deleteMany(keys: string[]): Promise<void> {
        await deleteMany(await this.getDb(), STORE_NAME, keys);
    }

    public async moveMany(items: MoveItem[]): Promise<void> {
        await moveMany(await this.getDb(), STORE_NAME, items);
    }

    public async scan(glob: string): Promise<string[]> {
        return scan(await this.getDb(), STORE_NAME, glob);
    }

    public async getTree(root: string): Promise<TreeNode> {
        return getTree(await this.getDb(), STORE_NAME, root);
    }
}

