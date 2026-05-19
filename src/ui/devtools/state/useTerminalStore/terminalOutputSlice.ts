import type { WritableDraft } from "immer";
import type { TerminalState, TerminalActions } from "../terminalStore.types";
import type { LogEntry } from "../../../../lib/terminal";

type FullStore = TerminalState & TerminalActions;

export type OutputSliceState = Pick<TerminalState, "logs">;

export type OutputSliceActions = Pick<
    TerminalActions,
    "addLog" | "clearLogs"
>;

export type OutputSlice = OutputSliceState & OutputSliceActions;

export const outputInitialState: OutputSliceState = {
    logs: [],
};

const MAX_LOGS = 200;

export const createOutputActions = (
    set: (fn: (state: WritableDraft<FullStore>) => void) => void,
): OutputSliceActions => ({
    addLog: (entry) =>
        set((state) => {
            state.logs.push({
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                ...entry,
            } as LogEntry);
            if (state.logs.length > MAX_LOGS)
                state.logs.splice(0, state.logs.length - MAX_LOGS);
        }),

    clearLogs: () =>
        set((state) => {
            state.logs = [];
        }),
});
