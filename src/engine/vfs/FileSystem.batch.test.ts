import { describe, expect, it, vi } from "vitest";
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
        return [...this.map.keys()];
    }
}

const makeFetcher = (
    handler: (url: string, init?: { body?: string; method?: string }) => any,
) =>
    vi.fn(async (url: string, init?: { body?: string; method?: string }) => {
        const out = handler(url, init);
        return {
            ok: out.ok,
            status: out.status ?? (out.ok ? 200 : 500),
            statusText: out.statusText ?? "",
            json: async () => out.json,
            text: async () => out.text ?? "",
        };
    }) as unknown as FetchLike<ModuleCartridge>;

describe("FileSystem batch operations", () => {
    it("deletePaths removes matching key prefixes", async () => {
        const fetcher = makeFetcher((url) => {
            if (url.startsWith("/__editor/read"))
                return {
                    ok: true,
                    json: createCartridge("g", { blueprints: {} }),
                };
            return { ok: true, json: [] };
        });
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.writeFile(
            "dir/a.json",
            createCartridge("a", { blueprints: {} }),
        );
        await fs.writeFile(
            "other.json",
            createCartridge("b", { blueprints: {} }),
        );
        await fs.deletePaths(["dir"]);
        const keys = await fs.listFiles();
        expect(keys).not.toContain("dir/a.json");
        expect(keys).toContain("other.json");
    });

    it("scan applies wildcard matching over virtual keys", async () => {
        const fetcher = makeFetcher((url) => {
            if (url.startsWith("/__editor/read"))
                return {
                    ok: true,
                    json: createCartridge("g", { blueprints: {} }),
                };
            return { ok: true, json: {} };
        });
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.writeFile("a.json", createCartridge("a", { blueprints: {} }));
        await fs.writeFile("b.txt", createCartridge("b", { blueprints: {} }));
        await expect(fs.scan("*.json")).resolves.toEqual(
            expect.arrayContaining(["a.json"]),
        );
    });

    it("tree is derived from virtual keys", async () => {
        const fetcher = makeFetcher((url) => {
            if (url.startsWith("/__editor/read"))
                return {
                    ok: true,
                    json: createCartridge("g", { blueprints: {} }),
                };
            return { ok: true, json: {} };
        });
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.writeFile(
            "x/y.json",
            createCartridge("y", { blueprints: {} }),
        );
        const tree = await fs.tree("");
        expect(tree.type).toBe("directory");
        expect(JSON.stringify(tree)).toContain("y.json");
    });

    it("movePaths moves nested trees", async () => {
        const fetcher = makeFetcher((url) => {
            if (url.startsWith("/__editor/read"))
                return {
                    ok: true,
                    json: createCartridge("g", { blueprints: {} }),
                };
            return { ok: true, json: {} };
        });
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.writeFile(
            "from/nested/a.json",
            createCartridge("a", { blueprints: {} }),
        );
        await fs.movePaths([{ from: "from", to: "to" }]);
        const keys = await fs.listFiles();
        expect(keys).not.toContain("from/nested/a.json");
        expect(keys).toContain("to/nested/a.json");
    });

    it("deletePaths with empty list does not call network", async () => {
        const fetcher = makeFetcher((url) => ({
            ok: !url.startsWith("/__editor/delete"),
            json: {},
        }));
        const fs = new FileSystem({ db: new MemoryDb(), fetcher, isDev: true });
        await fs.deletePaths([]);
        expect(
            (fetcher as unknown as { mock: { calls: unknown[] } }).mock.calls,
        ).toHaveLength(1);
    });
});
