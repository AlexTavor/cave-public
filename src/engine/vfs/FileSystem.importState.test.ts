import { describe, expect, it } from "vitest";
import { createCartridge } from "../test/factories";
import { FileSystem } from "./FileSystem";
import type { FetchLike, PersistenceAdapter } from "./persistence";
import type { ModuleCartridge } from "../../data/schemas/module";

class MemoryDb<T> implements PersistenceAdapter<T> {
    private readonly map = new Map<string, T>();
    async load(key: string) {
        return this.map.get(key);
    }
    async save(key: string, value: T) {
        this.map.set(key, value);
    }
    async delete(key: string) {
        this.map.delete(key);
    }
    async getAllKeys() {
        return [...this.map.keys()].sort((a, b) => a.localeCompare(b));
    }
    async importAll(data: Record<string, unknown>) {
        this.map.clear();
        Object.keys(data)
            .sort((a, b) => a.localeCompare(b))
            .forEach((key) => this.map.set(key, data[key] as T));
    }
}

const fetcher = (async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
    json: async () => null,
    text: async () => "",
})) as unknown as FetchLike<ModuleCartridge>;

describe("engine/vfs/FileSystem.importState", () => {
    it("replaces all existing VFS entries with the imported snapshot", async () => {
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });

        await fs.writeFile(
            "old/manifest.json",
            createCartridge("old", { blueprints: {} }),
        );

        await fs.importState({
            "manifest.json": createCartridge("root", { blueprints: {} }),
            "project/data.json": createCartridge("data", { blueprints: {} }),
        });

        await expect(fs.listFiles()).resolves.toEqual([
            "manifest.json",
            "project/data.json",
        ]);
    });

    it("reads imported text files from VFS without refetching from disk", async () => {
        let fetchCalls = 0;
        const recordingFetcher = (async () => {
            fetchCalls += 1;
            return {
                ok: false,
                status: 404,
                statusText: "Not Found",
                json: async () => null,
                text: async () => "",
            };
        }) as unknown as FetchLike<ModuleCartridge>;
        const fs = new FileSystem({
            db: new MemoryDb(),
            fetcher: recordingFetcher,
            isDev: true,
        });

        await fs.importState({
            "example/manifest.json": { name: "Example", files: [] },
            "example/scripts/start.cvs": "project-load example/manifest.json",
        });

        await expect(fs.readText("example/scripts/start.cvs")).resolves.toBe(
            "project-load example/manifest.json",
        );
        expect(fetchCalls).toBe(1);
    });

    it("rejects invalid bootstrap snapshots before mutating VFS", async () => {
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.writeFile(
            "manifest.json",
            createCartridge("root", { blueprints: {} }),
        );

        await expect(
            fs.importState([] as unknown as Record<string, unknown>),
        ).rejects.toThrow("Bootstrap snapshot must be a non-null object.");
        await expect(fs.listFiles()).resolves.toEqual([
            "game_data.json",
            "manifest.json",
        ]);
    });
});
