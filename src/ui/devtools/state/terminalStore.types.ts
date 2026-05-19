import type {
    CommandInputHandler,
    CommandRegistry,
    ExecutionContextInput,
    LogEntry,
} from "../../../lib/terminal";

export interface TerminalState {
    logs: LogEntry[];
    input: string;
    commandHistory: string[];
    historyIndex: number;
    suppressAutocomplete: boolean;
    activeSession: CommandInputHandler | null;
}

export interface TerminalActions {
    setInputValue: (val: string) => void;
    addLog: (entry: Omit<LogEntry, "id" | "timestamp">) => void;
    clearLogs: () => void;
    traverseHistory: (direction: "up" | "down") => void;
    abortAutocomplete: () => void;
    submitCommand: (
        command: string,
        registry: CommandRegistry,
        context?: ExecutionContextInput,
    ) => Promise<void>;
}
