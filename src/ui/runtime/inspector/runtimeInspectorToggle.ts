const STORAGE_KEY = "cave-runtime-inspector";

const readStored = (): boolean => {
    try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

let enabled = readStored();
const listeners = new Set<() => void>();

const notify = (): void => {
    for (const listener of listeners) listener();
};

const store = (): void => {
    try {
        globalThis.localStorage?.setItem(STORAGE_KEY, String(enabled));
    } catch {}
};

export const getRuntimeInspectorEnabled = (): boolean => enabled;

export const setRuntimeInspectorEnabled = (next: boolean): void => {
    if (enabled === next) return;
    enabled = next;
    store();
    notify();
};

export const toggleRuntimeInspectorEnabled = (): void => {
    setRuntimeInspectorEnabled(!enabled);
};

export const subscribeRuntimeInspectorEnabled = (
    listener: () => void,
): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
