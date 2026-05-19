import type { WritableDraft } from "immer";
import type { TerminalState, TerminalActions } from "../terminalStore.types";

type FullStore = TerminalState & TerminalActions;

export type HistorySliceState = Pick<
    TerminalState,
    "commandHistory" | "historyIndex" | "suppressAutocomplete"
>;

export type HistorySliceActions = Pick<
    TerminalActions,
    "traverseHistory" | "abortAutocomplete"
>;

export type HistorySlice = HistorySliceState & HistorySliceActions;

export const historyInitialState: HistorySliceState = {
    commandHistory: [],
    historyIndex: -1,
    suppressAutocomplete: false,
};

export const createHistoryActions = (
    set: (fn: (state: WritableDraft<FullStore>) => void) => void,
): HistorySliceActions => ({
    traverseHistory: (direction) =>
        set((state) => {
            if (state.commandHistory.length === 0) return;
            const maxIndex = state.commandHistory.length - 1;
            let next = -1;
            if (direction === "up") {
                if (state.historyIndex === -1) next = 0;
                else if (state.historyIndex >= maxIndex) next = -1;
                else next = state.historyIndex + 1;
            } else {
                next =
                    state.historyIndex <= 0 ? -1 : state.historyIndex - 1;
            }
            state.historyIndex = next;
            state.input = next === -1 ? "" : state.commandHistory[next];
            state.suppressAutocomplete = true;
        }),

    abortAutocomplete: () =>
        set((state) => {
            state.suppressAutocomplete = true;
        }),
});
