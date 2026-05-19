import { useMemo, useCallback } from "react";
import {
    CommandDefinition,
    CommandRegistry,
    composeCommands,
    ExecutionContextInput,
    LogEntry,
    Suggestion,
} from "../../../lib/terminal";
import { STANDARD_COMMANDS } from "../../../engine/terminal/commands";
import { RUNTIME_COMMANDS } from "../../runtime/terminal/runtimeRegistry";
import { useShellStore } from "../shell/shell";
import { useTerminalStore } from "../state/useTerminalStore";
import { useGameResourceAdapter } from "./GameResourceAdapter";
import { useRuntimeAdapter } from "./useRuntimeAdapter";
import {
    closeWorkspaceState,
    resetModuleEditorState,
} from "./closeWorkspaceState";
import { resetProjectHistory } from "../state/useProjectHistoryStore";

const normalizeProjectAlias = (raw: string): string => {
    const trimmed = raw.trimStart();
    const spaceIndex = trimmed.indexOf(" ");
    const command = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
    const rest = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex);
    if (!command.startsWith("project.")) return raw;
    return `${command.replace("project.", "project-")}${rest}`;
};

export interface UseGameTerminalResult {
    input: string;
    logs: LogEntry[];
    suggestions: Suggestion[];
    onChange: (val: string) => void;
    onSubmit: (val: string) => void;
    onHistoryNavigate: (dir: "up" | "down") => void;
    onAbort: () => void;
    registry: CommandRegistry;
    context: ExecutionContextInput;
}

export function useGameTerminal(
    extraCommands: CommandDefinition[] | undefined,
): UseGameTerminalResult {
    const { openFile, closeFile } = useShellStore();
    const resources = useGameResourceAdapter();
    const runtime = useRuntimeAdapter();

    const context = useMemo(
        () => ({
            resources,
            runtime,
            terminal: {
                clearLogs: () => useTerminalStore.getState().clearLogs(),
            },
            ui: {
                openFile,
                closeFile,
                closeWorkspace: () => closeWorkspaceState(runtime.unload),
                onProjectLoaded: (manifestPath: string) => {
                    resetModuleEditorState();
                    useShellStore.getState().setActiveManifest(manifestPath);
                    void resetProjectHistory();
                },
            },
        }),
        [closeFile, openFile, resources, runtime],
    );

    const registry = useMemo(
        () =>
            new CommandRegistry(
                composeCommands(
                    STANDARD_COMMANDS,
                    RUNTIME_COMMANDS,
                    extraCommands ?? [],
                ),
            ),
        [extraCommands],
    );

    const logs = useTerminalStore((s) => s.logs);
    const input = useTerminalStore((s) => s.input);
    const suppressAutocomplete = useTerminalStore(
        (s) => s.suppressAutocomplete,
    );
    const setInputValue = useTerminalStore((s) => s.setInputValue);
    const submitCommand = useTerminalStore((s) => s.submitCommand);
    const traverseHistory = useTerminalStore((s) => s.traverseHistory);

    const suggestions = useMemo(() => {
        if (!input.trim()) return [];
        if (suppressAutocomplete) return [];

        return registry.getSuggestions(normalizeProjectAlias(input), context);
    }, [context, input, registry, suppressAutocomplete]);

    const handleSubmit = useCallback(
        (cmd: string) => {
            submitCommand(normalizeProjectAlias(cmd), registry, context);
        },
        [context, registry, submitCommand],
    );

    return {
        input,
        logs,
        suggestions,
        onChange: setInputValue,
        onSubmit: handleSubmit,
        onHistoryNavigate: traverseHistory,
        onAbort: useTerminalStore.getState().abortAutocomplete,
        registry,
        context,
    };
}

