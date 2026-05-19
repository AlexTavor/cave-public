import styled from "@emotion/styled";
import { TerminalTheme } from "../types";
import { Theme } from "@emotion/react";

export const defaultTerminalTheme: TerminalTheme = {
    colors: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        prompt: "#3b82f6",
        cursor: "#d4d4d4",
        selection: "#264f78",
        error: "#f87171",
        success: "#4ade80",
        inputBackground: "transparent",
        cave: "#3b82f6",
        draft: "#00bbff",
        art: "#fbbf24",
        bp: "#aeff00",
        cvs: "#f700ff",
    },
    fonts: {
        mono: "'Consolas', 'Monaco', monospace",
        size: "13px",
    },
    spacing: {
        padding: "12px",
        lineHeight: "1.5",
    },
};

// Helper to resolve theme with safe fallback and TypeScript handling
const resolveTheme = (props: {
    theme: Theme;
    customTheme?: TerminalTheme;
}): TerminalTheme => {
    if (props.customTheme) return props.customTheme;

    return defaultTerminalTheme;
};

export const TerminalContainer = styled.div<{ customTheme?: TerminalTheme }>`
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: ${(p) => resolveTheme(p).colors.background};
    color: ${(p) => resolveTheme(p).colors.foreground};
    font-family: ${(p) => resolveTheme(p).fonts.mono};
    font-size: ${(p) => resolveTheme(p).fonts.size};
    overflow: hidden;
    position: relative;
`;

export const ScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${(p) => resolveTheme(p).spacing.padding};

    &::-webkit-scrollbar {
        width: 8px;
    }
    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
`;

export const Line = styled.div<{ type: string }>`
    line-height: ${(p) => resolveTheme(p).spacing.lineHeight};
    margin-bottom: 4px;
    word-break: break-word;
    white-space: pre-wrap;
    user-select: text;
    pointer-events: auto;
    color: ${(p) => {
        const t = resolveTheme(p);
        switch (p.type) {
            case "error":
                return t.colors.error;
            case "success":
                return t.colors.success;
            case "input":
                return t.colors.prompt;
            default:
                return "inherit";
        }
    }};
`;

export const InputWrapper = styled.div`
    display: flex;
    align-items: center;
    padding: 8px ${(p) => resolveTheme(p).spacing.padding};
    background: rgba(255, 255, 255, 0.05);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
`;

export const PromptLabel = styled.span`
    color: ${(p) => resolveTheme(p).colors.prompt};
    margin-right: 8px;
    font-weight: bold;
    user-select: none;
`;

export const StyledInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font-family: inherit;
    font-size: inherit;

    &::placeholder {
        opacity: 0.3;
    }
`;

export const SuggestionsList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    background: #252526;
    border: 1px solid #454545;
    width: 300px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.5);
`;

export const SuggestionItem = styled.li<{ active: boolean }>`
    padding: 6px 12px;
    background: ${(p) => (p.active ? "#37373d" : "transparent")};
    color: ${(p) => (p.active ? "#fff" : "#ccc")};
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;

    &:hover {
        background: #2a2d2e;
    }
`;

export const SuggestionType = styled.span`
    font-size: 0.8em;
    opacity: 0.5;
    border: 1px solid #555;
    padding: 0 4px;
    border-radius: 2px;
    text-transform: uppercase;
`;
