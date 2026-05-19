import { vfs } from "../../engine/vfs/FileSystem";
import type { SaveGameData } from "../../engine/runtime/persistence/types";

const SAVE_DIR = "saves";

const toPath = (name: string): string => `${SAVE_DIR}/${name}.json`;

export const SaveGameService = {
    async save(name: string, data: SaveGameData): Promise<void> {
        await vfs.writeFile(toPath(name), data as unknown as any);
    },

    async load(name: string): Promise<SaveGameData | null> {
        const raw = await vfs.readFile(toPath(name));
        return raw ? (raw as unknown as SaveGameData) : null;
    },

    async list(): Promise<string[]> {
        const keys = await vfs.scan(`${SAVE_DIR}/*.json`);
        return keys.map((k) =>
            k.replace(`${SAVE_DIR}/`, "").replace(/\.json$/, ""),
        );
    },

    async remove(name: string): Promise<void> {
        await vfs.deleteFile(toPath(name));
    },
};
