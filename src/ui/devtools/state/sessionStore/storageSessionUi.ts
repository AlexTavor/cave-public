import type { SessionUiState } from "../sessionLogic";

const UI_NAMESPACE = "cave.sessionUi:";

type UiMap = Record<string, SessionUiState>;

const getSession = (): Storage | null => {
    try {
        return globalThis.window?.sessionStorage ?? null;
    } catch {
        return null;
    }
};

const uiKey = (filename: string) => `${UI_NAMESPACE}${filename}`;

export const persistSessionUi = (filename: string, ui: UiMap) => {
    const s = getSession();
    if (!s) return;
    try {
        s.setItem(uiKey(filename), JSON.stringify(ui));
    } catch {
        /* quota / private mode */
    }
};

export const loadPersistedSessionUi = (filename: string): UiMap | null => {
    const s = getSession();
    if (!s) return null;
    try {
        const raw = s.getItem(uiKey(filename));
        return raw ? (JSON.parse(raw) as UiMap) : null;
    } catch {
        return null;
    }
};

export const clearPersistedSessionUi = (filename: string) => {
    const s = getSession();
    if (!s) return;
    try {
        s.removeItem(uiKey(filename));
    } catch {
        /* ignore */
    }
};

export const clearAllPersistedSessionUi = () => {
    const s = getSession();
    if (!s) return;
    try {
        const keys: string[] = [];
        for (let i = 0; i < s.length; i += 1) {
            const key = s.key(i);
            if (key?.startsWith(UI_NAMESPACE)) keys.push(key);
        }
        keys.forEach((key) => s.removeItem(key));
    } catch {
        /* ignore */
    }
};
