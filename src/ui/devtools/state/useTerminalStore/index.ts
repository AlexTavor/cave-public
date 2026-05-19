import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { TerminalState, TerminalActions } from "../terminalStore.types";

export type { TerminalState, TerminalActions };

import {
    historyInitialState,
    createHistoryActions,
} from "./terminalHistorySlice";
import {
    outputInitialState,
    createOutputActions,
} from "./terminalOutputSlice";

export const useTerminalStore = create<TerminalState & TerminalActions>()(
    persist(
        immer((set, get) => ({
            ...outputInitialState,
            ...historyInitialState,
            input: "",
            activeSession: null,

            ...createOutputActions(set),
            ...createHistoryActions(set),

            setInputValue: (val) =>
                set((state) => {
                    state.input = val;
                    state.historyIndex = -1;
                    state.suppressAutocomplete = false;
                }),

            submitCommand: async (cmdString, registry, context = {}) => {
                const trimmed = cmdString.trim();
                if (!trimmed) return;
                const { addLog, activeSession } = get();
                addLog({ type: "input", content: `> ${cmdString}` });
                set((state) => {
                    state.commandHistory.unshift(trimmed);
                    state.historyIndex = -1;
                    state.input = "";
                    state.suppressAutocomplete = false;
                });
                try {
                    const execContext = { registry, ...context };
                    const result = activeSession
                        ? await activeSession(trimmed, execContext)
                        : await registry.execute(trimmed, context);
                    set((state) => {
                        state.activeSession = result.next ?? null;
                    });
                    addLog({ type: result.type, content: result.content });
                } catch (error) {
                    set((state) => {
                        state.activeSession = null;
                    });
                    addLog({
                        type: "error",
                        content: `Execution failed: ${(error as Error).message}`,
                    });
                }
            },
        })),
        {
            name: "cave-os-terminal-v1",
            partialize: (state) => ({
                logs: state.logs,
                commandHistory: state.commandHistory,
            }),
        },
    ),
);
