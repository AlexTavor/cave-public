const STORAGE_KEY = "cave-phaser-debug";

const readStored = (): boolean => {
    try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

let enabled = readStored();
const listeners = new Set<() => void>();
const resetters = new Set<() => void>();

const notify = (): void => {
    for (const listener of listeners) listener();
};

const store = (): void => {
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {}
};

export const getPhaserDebugEnabled = (): boolean => enabled;

export const setPhaserDebugEnabled = (next: boolean): void => {
    if (enabled === next) return;
    enabled = next;
    store();
    if (!enabled) {
        for (const reset of resetters) reset();
    }
    notify();
};

export const togglePhaserDebugEnabled = (): void => {
    setPhaserDebugEnabled(!enabled);
};

export const subscribePhaserDebugEnabled = (
    listener: () => void,
): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const registerPhaserDebugResetter = (
    reset: () => void,
): (() => void) => {
    resetters.add(reset);
    return () => resetters.delete(reset);
};
