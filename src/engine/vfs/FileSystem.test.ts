import { describe, expect, it } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { FetchLike, PersistenceAdapter } from "./persistence";
import { FileSystem } from "./FileSystem";
import { createCartridge } from "../test/factories";

class MemoryPersistence<T> implements PersistenceAdapter<T> {
    private readonly store = new Map<string, T>();

    async load(key: string): Promise<T | undefined> {
        return this.store.get(key);
    }

    async save(key: string, value: T): Promise<void> {
        this.store.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    async getAllKeys(): Promise<string[]> {
        return [...this.store.keys()].sort((a, b) => a.localeCompare(b));
    }
}

function makeFetchMock(routes: {
    [url: string]: {
        ok: boolean;
        status?: number;
        statusText?: string;
        json?: Object;
        text?: string;
        onCall?: (init?: { body?: string }) => void;
    };
}): FetchLike<ModuleCartridge> {
    return (async (input: string, init?: { body?: string }) => {
        const route = routes[input];
        if (!route) {
            throw new Error(`Unexpected fetch: ${input}`);
        }
        route.onCall?.(init);
        return {
            ok: route.ok,
            status: route.status ?? (route.ok ? 200 : 500),
            statusText: route.statusText ?? (route.ok ? "OK" : "ERR"),
            json: async () => route.json,
            text: async () => route.text ?? "",
        };
    }) as FetchLike<ModuleCartridge>;
}

describe("engine/vfs/FileSystem", () => {
    it("seeds DB from disk when DB empty", async () => {
        const disk: ModuleCartridge = createCartridge("game_data", {
            metadata: { id: "game_data", name: "Game", version: "0.0.1" },
            blueprints: {},
        });

        const db = new MemoryPersistence<ModuleCartridge>();
        const fetcher = makeFetchMock({
            "/__editor/read?path=src%2Fdata%2Fraw%2Fgame_data.json": {
                ok: true,
                json: disk,
            },
        });

        const fs = new FileSystem({
            db,
            fetcher,
            isDev: true,
            fatFile: "game_data.json",
            sourcePath: "src/data/raw",
        });

        await fs.init();
        const loaded = await fs.readFile("game_data.json");
        expect(loaded?.metadata.version).toBe("0.0.1");
    });

    it("keeps DB when DB newer than disk", async () => {
        const disk: ModuleCartridge = createCartridge("game_data", {
            metadata: { id: "game_data", name: "Game", version: "0.0.1" },
            blueprints: {},
        });
        const newerDb: ModuleCartridge = createCartridge("game_data", {
            metadata: { id: "game_data", name: "Game", version: "0.0.2" },
            blueprints: {},
        });

        const db = new MemoryPersistence<ModuleCartridge>();
        await db.save("game_data.json", newerDb);

        const fetcher = makeFetchMock({
            "/__editor/read?path=src%2Fdata%2Fraw%2Fgame_data.json": {
                ok: true,
                json: disk,
            },
        });

        const fs = new FileSystem({
            db,
            fetcher,
            isDev: true,
            fatFile: "game_data.json",
            sourcePath: "src/data/raw",
        });

        await fs.init();
        const loaded = await fs.readFile("game_data.json");
        expect(loaded?.metadata.version).toBe("0.0.2");
    });

    it("saveToDisk posts the expected payload", async () => {
        const mod: ModuleCartridge = createCartridge("game_data", {
            metadata: { id: "game_data", name: "Game", version: "0.0.1" },
            blueprints: {},
        });

        const db = new MemoryPersistence<ModuleCartridge>();
        await db.save("game_data.json", mod);

        let savedBody: { path: string; content: ModuleCartridge } = {
            path: "",
            content: mod,
        };

        const fetcher = makeFetchMock({
            // init() tries to read disk; simulate missing disk but that's OK (db already populated)
            "/__editor/read?path=src%2Fdata%2Fraw%2Fgame_data.json": {
                ok: false,
                status: 404,
                statusText: "Not Found",
            },
            "/__editor/save": {
                ok: true,
                onCall: (init) => {
                    savedBody = JSON.parse(init?.body as string);
                },
            },
        });

        const fs = new FileSystem({
            db,
            fetcher,
            isDev: true,
            fatFile: "game_data.json",
            sourcePath: "src/data/raw",
        });

        await fs.saveToDisk("game_data.json");

        expect(savedBody?.path).toBe("src/data/raw/game_data.json");
        expect(savedBody?.content.metadata.version).toBe("0.0.1");
    });
});
