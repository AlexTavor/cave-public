import React, { useRef } from "react";
import { TerminalContainer } from "./styles";
import { LogEntry, Suggestion, TerminalTheme } from "../types";
import { LogList } from "./LogList";
import { SmartInput } from "./SmartInput";

export interface TerminalViewProps {
    input: string;
    logs: LogEntry[];
    suggestions: Suggestion[];
    onInputChange: (val: string) => void;
    onSubmit: (val: string) => void;
    onHistoryNavigate: (dir: "up" | "down") => void;
    onAbort?: () => void;
    theme?: TerminalTheme;
    promptLabel?: string;
    placeholder?: string;
    bottomRef: React.RefObject<HTMLDivElement | null>;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const Terminal: React.FC<TerminalViewProps> = ({
    input,
    logs,
    suggestions,
    onInputChange,
    onSubmit,
    onHistoryNavigate,
    onAbort,
    theme,
    promptLabel = "➜",
    placeholder = "Type a command, or help for a list...",
    bottomRef,
    scrollRef,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Keep input focused when clicking the empty background area
    const handleContainerClick = (e: React.MouseEvent) => {
        // Only focus if we didn't click something interactive
        if ((e.target as HTMLElement).tagName !== "INPUT") {
            const inputEl = containerRef.current?.querySelector("input");
            inputEl?.focus();
        }
    };

    // Intercept ArrowUp/Down for History navigation BEFORE SmartInput handles them for suggestions
    // Note: SmartInput handles arrows when suggestions > 0.
    // We need to handle arrows when suggestions === 0 for History.
    const handleKeyDownCapture = (e: React.KeyboardEvent) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        if (suggestions.length > 0) return;

        e.preventDefault();
        onHistoryNavigate(e.key === "ArrowUp" ? "up" : "down");
    };

    return (
        <TerminalContainer
            customTheme={theme}
            onClick={handleContainerClick}
            ref={containerRef}
            onKeyDownCapture={handleKeyDownCapture}
        >
            <LogList logs={logs} bottomRef={bottomRef} scrollRef={scrollRef} />

            <SmartInput
                value={input}
                suggestions={suggestions}
                onChange={onInputChange}
                onSubmit={onSubmit}
                onAbort={onAbort}
                promptLabel={promptLabel}
                placeholder={placeholder}
                autoFocus
            />
        </TerminalContainer>
    );
};
