import type React from "react";
import type { Suggestion } from "../types";

interface KeyDownParams {
    suggestions: Suggestion[];
    suggestionIndex: number;
    applySuggestion: (index: number) => void;
    setSuggestionIndex: React.Dispatch<React.SetStateAction<number>>;
    onAbort?: () => void;
    onSubmit: (value: string) => void;
    value: string;
    multiline?: boolean;
}

const handleEnter = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    params: KeyDownParams,
) => {
    if (params.multiline) {
        if (e.shiftKey || params.suggestions.length === 0) return;
        e.preventDefault();
        params.applySuggestion(params.suggestionIndex);
        return;
    }
    e.preventDefault();
    if (params.suggestions.length > 0 && params.suggestionIndex >= 0) {
        params.applySuggestion(params.suggestionIndex);
        return;
    }
    params.onSubmit(params.value);
};

const handleArrow = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    params: KeyDownParams,
    direction: -1 | 1,
) => {
    if (params.suggestions.length === 0) return;
    e.preventDefault();
    params.setSuggestionIndex((prev) => {
        const last = params.suggestions.length - 1;
        if (direction < 0) return prev > 0 ? prev - 1 : last;
        return prev < last ? prev + 1 : 0;
    });
};

export const handleSmartInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    params: KeyDownParams,
): void => {
    if (e.defaultPrevented) return;
    if (e.key === "Escape" && params.suggestions.length > 0) {
        e.preventDefault();
        params.onAbort?.();
        return;
    }
    if (e.key === "Enter") return handleEnter(e, params);
    if (e.key === "Tab") {
        e.preventDefault();
        if (params.suggestions.length > 0) {
            params.applySuggestion(params.suggestionIndex);
        }
        return;
    }
    if (e.key === "ArrowUp") return handleArrow(e, params, -1);
    if (e.key === "ArrowDown") return handleArrow(e, params, 1);
};
