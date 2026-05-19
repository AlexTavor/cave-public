import { ReactNode } from "react";
import type { ResourceProvider, RuntimeProvider } from "./types.providers";
export type { ResourceProvider, RuntimeProvider } from "./types.providers";

export type LogType =
    | "input"
    | "output"
    | "error"
    | "info"
    | "success"
    | "component";

export interface LogEntry {
    id: string;
    timestamp: number;
    type: LogType;
    content: ReactNode;
}

export type CommandInputHandler = (
    input: string,
    context: ExecutionContext,
) => Promise<CommandResult>;

export interface CommandResult {
    type: LogType;
    content: ReactNode;
    next?: CommandInputHandler;
}

export interface Suggestion {
    label: string;
    type: "command" | "argument" | "value" | "operator";
    description?: string;
    insertText?: string;
    replace?: { from: number; to: number };
    cursor?: { at: number };
}

// Interface for the Registry to allow commands to introspect it
export interface ICommandRegistry {
    getCommand(name: string): CommandDefinition | undefined;
    getAllCommands(): CommandDefinition[];
    execute: (
        input: string,
        context?: ExecutionContextInput,
    ) => Promise<CommandResult>;
}

export interface ExecutionContext {
    registry: ICommandRegistry;
    resources?: ResourceProvider;
    runtime?: RuntimeProvider;
    terminal?: {
        clearLogs: () => void;
    };
    ui?: {
        openFile: (path: string) => void;
        closeFile: (path: string) => void;
        closeWorkspace?: () => void;
        onProjectLoaded?: (manifestPath: string) => void;
    };
}

/**
 * Context values provided by the host environment.
 * The registry always injects itself as `registry`.
 */
export type ExecutionContextInput = Omit<ExecutionContext, "registry">;

export interface CommandDefinition {
    name: string;
    description: string;
    usage: string;
    examples?: string[];

    /**
     * Execute the command.
     */
    execute: (
        args: string[],
        context: ExecutionContext,
    ) => CommandResult | Promise<CommandResult>;

    /**
     * Get autocomplete suggestions.
     */
    autocomplete?: (args: string[], context: ExecutionContext) => Suggestion[];
}

export interface TerminalTheme {
    colors: {
        background: string;
        foreground: string;
        prompt: string;
        cursor: string;
        selection: string;
        error: string;
        success: string;
        inputBackground: string;
        cave: string;
        draft: string;
        art: string;
        bp: string;
        cvs: string;
    };
    fonts: {
        mono: string;
        size: string;
    };
    spacing: {
        padding: string;
        lineHeight: string;
    };
}

