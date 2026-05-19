import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";

enableMapSet();

export interface InteractionState {
    blockers: Set<string>;
}

export interface InteractionActions {
    addBlocker: (reason: string) => void;
    removeBlocker: (reason: string) => void;
}

export const useInteractionStore = create<
    InteractionState & InteractionActions
>()(
    immer((set) => ({
        blockers: new Set(),

        addBlocker: (reason) => {
            set((state) => {
                state.blockers.add(reason);
            });
        },

        removeBlocker: (reason) => {
            set((state) => {
                state.blockers.delete(reason);
            });
        },
    }))
);

export const selectIsBlocked = (state: InteractionState) =>
    state.blockers.size > 0;
