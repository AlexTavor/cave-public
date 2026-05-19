const STORAGE_KEY = "cave-node-overlays-enabled";

const readStored = (): boolean => {
    try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) !== "false";
    } catch {
        return true;
    }
};

let enabled = readStored();
const listeners = new Set<() => void>();

const store = () => {
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {}
};

export const getNodeOverlaysEnabled = (): boolean => enabled;

export const setNodeOverlaysEnabled = (next: boolean): void => {
    if (enabled === next) return;
    enabled = next;
    store();
    for (const listener of listeners) listener();
};

export const toggleNodeOverlaysEnabled = (): void => {
    setNodeOverlaysEnabled(!enabled);
};

export const subscribeNodeOverlaysEnabled = (
    listener: () => void,
): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
