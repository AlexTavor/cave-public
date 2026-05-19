const STORAGE_KEY = "cave-node-overlay-values-enabled";

const readStored = (): boolean => {
    try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) !== "false";
    } catch {
        return false;
    }
};

let enabled = readStored();
const listeners = new Set<() => void>();

const store = () => {
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {}
};

export const getNodeOverlayValuesEnabled = (): boolean => enabled;

export const setNodeOverlayValuesEnabled = (next: boolean): void => {
    if (enabled === next) return;
    enabled = next;
    store();
    listeners.forEach((listener) => listener());
};

export const subscribeNodeOverlayValuesEnabled = (
    listener: () => void,
): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
