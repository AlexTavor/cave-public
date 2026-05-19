import { create } from "zustand";

export type UiAvatarCacheEntry = {
    status: "ready" | "error";
    url: string | null;
};

type UiAvatarStoreState = {
    entries: Record<string, UiAvatarCacheEntry>;
    setReady: (key: string, url: string) => void;
    setError: (key: string) => void;
    clear: () => void;
};

export const useUiAvatarStore = create<UiAvatarStoreState>((set) => ({
    entries: {},
    setReady: (key, url) => set((state) => ({
        entries: { ...state.entries, [key]: { status: "ready", url } },
    })),
    setError: (key) => set((state) => ({
        entries: { ...state.entries, [key]: { status: "error", url: null } },
    })),
    clear: () => set({ entries: {} }),
}));