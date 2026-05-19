import { create } from "zustand";

export interface TabGuard {
    tabId: string;
    title: string;
    isDirty: boolean;
    requestSave?: () => Promise<void>;
    discardChanges?: () => void;
}

interface TabGuardState {
    guards: Record<string, TabGuard>;

    upsertGuard: (guard: TabGuard) => void;
    removeGuard: (tabId: string) => void;

    isDirty: (tabId: string) => boolean;
    anyDirty: () => boolean;
    getGuard: (tabId: string) => TabGuard | null;
}

export const useTabGuardStore = create<TabGuardState>((set, get) => ({
    guards: {},

    upsertGuard: (guard) =>
        set((s) => {
            const current = s.guards[guard.tabId];
            const unchanged =
                current?.title === guard.title &&
                current?.isDirty === guard.isDirty &&
                current?.requestSave === guard.requestSave &&
                current?.discardChanges === guard.discardChanges;
            if (unchanged) return s;
            return { guards: { ...s.guards, [guard.tabId]: guard } };
        }),

    removeGuard: (tabId) =>
        set((s) => {
            if (!s.guards[tabId]) return s;
            const next = { ...s.guards };
            delete next[tabId];
            return { guards: next };
        }),

    isDirty: (tabId) => get().guards[tabId]?.isDirty ?? false,

    anyDirty: () => Object.values(get().guards).some((g) => g.isDirty),

    getGuard: (tabId) => get().guards[tabId] ?? null,
}));

