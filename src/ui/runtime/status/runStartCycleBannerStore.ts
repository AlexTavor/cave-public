import { create } from "zustand";

export type RunStartCycleBannerEvent = {
    runNumber: number;
    revision: number;
};

type RunStartCycleBannerState = {
    banner: RunStartCycleBannerEvent | null;
    revision: number;
    reset: () => void;
    show: (runNumber: number) => void;
};

export const runStartCycleBannerStore = create<RunStartCycleBannerState>()(
    (set) => ({
        banner: null,
        revision: 0,
        reset: () => set({ banner: null }),
        show: (runNumber) =>
            set((state) => {
                const revision = state.revision + 1;
                return { banner: { runNumber, revision }, revision };
            }),
    }),
);

export const useRunStartCycleBannerStore = runStartCycleBannerStore;
export const selectRunStartCycleBanner = (state: RunStartCycleBannerState) =>
    state.banner;
