import { create } from "zustand";

export type UndoEntry =
    | { kind: "session"; sessionId: string }
    | { kind: "project" };

export interface UndoHistoryState {
    past: UndoEntry[];
    future: UndoEntry[];
    isBusy: boolean;
    canUndo: boolean;
    canRedo: boolean;

    recordSessionEdit: (sessionId: string) => void;
    recordProjectEdit: () => void;
    clear: () => void;
    peekUndo: () => UndoEntry | null;
    peekRedo: () => UndoEntry | null;
    commitUndo: () => void;
    commitRedo: () => void;
    setBusy: (busy: boolean) => void;
}

const deriveFlags = (past: UndoEntry[], future: UndoEntry[]) => ({
    canUndo: past.length > 0,
    canRedo: future.length > 0,
});

export const useUndoHistoryStore = create<UndoHistoryState>()((set, get) => ({
    past: [],
    future: [],
    isBusy: false,
    canUndo: false,
    canRedo: false,

    recordSessionEdit: (sessionId) => {
        if (get().isBusy) return;
        set((s) => {
            const past = [...s.past, { kind: "session" as const, sessionId }];
            return { past, future: [], ...deriveFlags(past, []) };
        });
    },

    recordProjectEdit: () => {
        if (get().isBusy) return;
        set((s) => {
            const past = [...s.past, { kind: "project" as const }];
            return { past, future: [], ...deriveFlags(past, []) };
        });
    },

    clear: () =>
        set({
            past: [],
            future: [],
            canUndo: false,
            canRedo: false,
            isBusy: false,
        }),

    peekUndo: () => {
        const { past } = get();
        return past.at(-1) ?? null;
    },

    peekRedo: () => {
        const { future } = get();
        return future.length > 0 ? future[0] : null;
    },

    commitUndo: () =>
        set((s) => {
            if (s.past.length === 0) return s;
            const entry = s.past.at(-1)!;
            const past = s.past.slice(0, -1);
            const future = [entry, ...s.future];
            return { past, future, ...deriveFlags(past, future) };
        }),

    commitRedo: () =>
        set((s) => {
            if (s.future.length === 0) return s;
            const entry = s.future[0];
            const past = [...s.past, entry];
            const future = s.future.slice(1);
            return { past, future, ...deriveFlags(past, future) };
        }),

    setBusy: (busy) => set({ isBusy: busy }),
}));
