import { describe, expect, it } from "vitest";
import {
    assertValidBootstrapSnapshot,
    BOOTSTRAP_SNAPSHOT_DISK_PATH,
    BOOTSTRAP_SNAPSHOT_PUBLIC_URL,
    decideHydration,
    getDiskReadUrl,
    getDiskWritePath,
    loadBootstrapSnapshotFromPublicAsset,
} from "./bootstrap";
import type { FetchLike } from "./persistence";
import type { ModuleCartridge } from "../../data/schemas/module";
import { Blueprint } from "../../data/schemas/blueprint";
import { createCartridge } from "../test/factories";

const makeFetch = (response: {
    ok: boolean;
    status?: number;
    statusText?: string;
    json?: Record<string, unknown> | unknown[] | null;
}) =>
    (async () => ({
        ok: response.ok,
        status: response.status ?? (response.ok ? 200 : 500),
        statusText: response.statusText ?? "ERR",
        json: async () => response.json,
        text: async () => "",
    })) as FetchLike<Record<string, unknown>>;

describe("engine/vfs/bootstrap", () => {
    const disk: ModuleCartridge = createCartridge("game_data", {
        metadata: { id: "game_data", name: "Game", version: "0.0.2" },
        blueprints: {} as Record<string, Blueprint>,
    });

    const db: ModuleCartridge = createCartridge("game_data", {
        metadata: { id: "game_data", name: "Game", version: "0.0.1" },
        blueprints: {} as Record<string, Blueprint>,
    });

    it("decides to overwrite DB when disk newer", () => {
        const d = decideHydration({ diskData: disk, dbData: db });
        expect(d.kind).toBe("overwrite_db_with_disk");
    });

    it("decides to keep DB when DB newer/equal", () => {
        const dbNewer: ModuleCartridge = {
            ...db,
            metadata: { ...db.metadata, version: "1.0.0" },
        };
        const d = decideHydration({ diskData: disk, dbData: dbNewer });
        expect(d.kind).toBe("keep_db");
    });

    it("decides to seed DB when DB empty", () => {
        const d = decideHydration({ diskData: disk, dbData: undefined });
        expect(d.kind).toBe("seed_db_from_disk");
    });

    it("decides to create empty when neither exists", () => {
        const d = decideHydration({ diskData: null, dbData: undefined });
        expect(d.kind).toBe("create_empty");
    });

    it("builds disk read/write paths", () => {
        expect(
            getDiskReadUrl({
                isDev: true,
                sourceDir: "src/data/raw",
                filename: "game_data.json",
            }),
        ).toContain("/__editor/read?path=");

        expect(
            getDiskReadUrl({
                isDev: false,
                sourceDir: "src/data/raw",
                filename: "game_data.json",
            }),
        ).toBe("/game_data.json");

        expect(
            getDiskWritePath({ sourceDir: "src/data/raw", filename: "x.json" }),
        ).toBe("src/data/raw/x.json");
    });

    it("accepts valid bootstrap snapshots and rejects invalid ones", () => {
        expect(assertValidBootstrapSnapshot({ "manifest.json": {} })).toEqual({
            "manifest.json": {},
        });
        expect(() => assertValidBootstrapSnapshot(null)).toThrow(
            "Bootstrap snapshot must be a non-null object.",
        );
        expect(() => assertValidBootstrapSnapshot([])).toThrow(
            "Bootstrap snapshot must be a non-null object.",
        );
    });

    it("exports the exact bootstrap asset paths", () => {
        expect(BOOTSTRAP_SNAPSHOT_DISK_PATH).toBe(
            "public/bootstrap/vfs-prod.json",
        );
        expect(BOOTSTRAP_SNAPSHOT_PUBLIC_URL).toBe(
            `${import.meta.env.BASE_URL}bootstrap/vfs-prod.json`,
        );
    });

    it("loads and validates the public bootstrap snapshot", async () => {
        await expect(
            loadBootstrapSnapshotFromPublicAsset(
                makeFetch({ ok: true, json: { "manifest.json": {} } }),
            ),
        ).resolves.toEqual({ "manifest.json": {} });
    });

    it("throws an explicit error when public bootstrap loading fails", async () => {
        await expect(
            loadBootstrapSnapshotFromPublicAsset(
                makeFetch({ ok: false, status: 404, statusText: "Not Found" }),
            ),
        ).rejects.toThrow("Failed to load bootstrap snapshot: 404 Not Found");
    });
});

