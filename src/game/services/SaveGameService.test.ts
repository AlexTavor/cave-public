import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaveGameService } from "./SaveGameService";
import type { SaveGameData } from "../../engine/runtime/persistence/types";

vi.mock("../../engine/vfs/FileSystem", () => {
    const store = new Map<string, unknown>();
    return {
        vfs: {
            writeFile: vi.fn((path: string, data: unknown) => {
                store.set(path, data);
                return Promise.resolve();
            }),
            readFile: vi.fn((path: string) =>
                Promise.resolve(store.get(path) ?? null),
            ),
            scan: vi.fn((glob: string) => {
                const prefix = glob.replace("*.json", "");
                const keys = [...store.keys()].filter((k) =>
                    k.startsWith(prefix),
                );
                return Promise.resolve(keys);
            }),
            deleteFile: vi.fn((path: string) => {
                store.delete(path);
                return Promise.resolve();
            }),
        },
    };
});

const makeSaveData = (label: string): SaveGameData => ({
    metadata: {
        version: "1",
        timestamp: Date.now(),
        label,
        seed: "test-seed",
    },
    state: {
        tick: 100,
        timeScale: 1,
        entities: [],
        physics: {},
        systems: {
            automation: {
                activeCount: 0,
                nextEventMs: null,
                nextCommand: null,
            },
        },
    },
});

describe("SaveGameService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("saves and loads a save file", async () => {
        // Given
        const data = makeSaveData("test-save");

        // When
        await SaveGameService.save("slot1", data);
        const loaded = await SaveGameService.load("slot1");

        // Then
        expect(loaded).toEqual(data);
    });

    it("returns null for non-existent save", async () => {
        // When
        const result = await SaveGameService.load("missing");

        // Then
        expect(result).toBeNull();
    });

    it("lists save names without extensions", async () => {
        // Given
        await SaveGameService.save("alpha", makeSaveData("alpha"));
        await SaveGameService.save("beta", makeSaveData("beta"));

        // When
        const names = await SaveGameService.list();

        // Then
        expect(names).toContain("alpha");
        expect(names).toContain("beta");
    });

    it("deletes a save file", async () => {
        // Given
        await SaveGameService.save("doomed", makeSaveData("doomed"));

        // When
        await SaveGameService.remove("doomed");
        const result = await SaveGameService.load("doomed");

        // Then
        expect(result).toBeNull();
    });
});
