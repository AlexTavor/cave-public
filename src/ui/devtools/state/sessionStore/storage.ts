import type { ModuleCartridge } from "../../../../data/schemas/module";
import { ModuleCartridgeSchema } from "../../../../data/schemas/module";

const STORAGE_NAMESPACE = "cave.moduleDraft:";

const getStorage = (): Storage | null => {
    if (typeof globalThis === "undefined" || !globalThis.window) {
        return null;
    }
    try {
        return globalThis.window.localStorage;
    } catch {
        return null;
    }
};

const storageKey = (filename: string) => `${STORAGE_NAMESPACE}${filename}`;

export const loadPersistedDraft = (
    filename: string,
): ModuleCartridge | null => {
    const storage = getStorage();
    if (!storage) return null;
    try {
        const raw = storage.getItem(storageKey(filename));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const result = ModuleCartridgeSchema.safeParse(parsed);
        return result.success ? result.data : null;
    } catch {
        return null;
    }
};

export const persistDraft = (filename: string, draft: ModuleCartridge) => {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.setItem(storageKey(filename), JSON.stringify(draft));
    } catch {
        // Ignore storage failures (quota, private mode, etc.)
    }
};

export const clearPersistedDraft = (filename: string) => {
    const storage = getStorage();
    if (!storage) return;
    try {
        storage.removeItem(storageKey(filename));
    } catch {
        // Ignore storage failures
    }
};

export const clearAllPersistedDrafts = () => {
    const storage = getStorage();
    if (!storage) return;
    try {
        const keys: string[] = [];
        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (key?.startsWith(STORAGE_NAMESPACE)) {
                keys.push(key);
            }
        }
        keys.forEach((key) => storage.removeItem(key));
    } catch {
        // Ignore storage failures
    }
};
