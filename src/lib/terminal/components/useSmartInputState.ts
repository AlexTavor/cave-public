import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { Suggestion } from "../types";
import { applySuggestionToValue } from "./smartInputInsertion";
import { handleSmartInputKeyDown } from "./smartInputKeyDown";

export interface UseSmartInputStateProps {
    value: string;
    suggestions: Suggestion[];
    inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    onChange: (val: string) => void;
    onSubmit: (val: string) => void;
    onAbort?: () => void;
    onCursorChange?: (cursor: number) => void;
    autoFocus?: boolean;
    multiline?: boolean;
}

export interface SmartInputState {
    suggestionIndex: number;
    showSuggestions: boolean;
    inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
    handleChange: (value: string) => void;
    handleKeyDown: (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => void;
    handleFocus: () => void;
    handleBlur: () => void;
    handleCursorUpdate: () => void;
    handleSelectSuggestion: (idx: number) => void;
}

export const useSmartInputState = ({
    value,
    suggestions,
    inputRef: externalInputRef,
    onChange,
    onSubmit,
    onAbort,
    onCursorChange,
    autoFocus = false,
    multiline = false,
}: UseSmartInputStateProps): SmartInputState => {
    const internalInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(
        null,
    );
    const inputRef = externalInputRef ?? internalInputRef;

    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setSuggestionIndex((prev) =>
            suggestions.length > 0 && prev < suggestions.length ? prev : 0,
        );
    }, [suggestions]);

    useEffect(() => {
        if (autoFocus) {
            inputRef.current?.focus();
        }
    }, [autoFocus, inputRef]);

    const updateCursor = (): void => {
        const cursor = inputRef.current?.selectionStart ?? 0;
        onCursorChange?.(cursor);
    };

    const setCursorPosition = (cursor: number): void => {
        requestAnimationFrame(() => {
            const el = inputRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(cursor, cursor);
            onCursorChange?.(cursor);
        });
    };

    const applySuggestion = (idx: number): void => {
        const s = suggestions[idx];
        if (!s) return;

        const cursor = inputRef.current?.selectionStart ?? value.length;
        const result = applySuggestionToValue(value, s, cursor);
        setCursorPosition(result.cursor);
        onChange(result.nextValue);
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): void => {
        handleSmartInputKeyDown(e, {
            suggestions,
            suggestionIndex,
            applySuggestion,
            setSuggestionIndex,
            onAbort,
            onSubmit,
            value,
            multiline,
        });
    };

    return {
        suggestionIndex,
        showSuggestions: isFocused && suggestions.length > 0,
        inputRef,
        handleChange: (nextValue: string) => {
            onChange(nextValue);
            updateCursor();
        },
        handleKeyDown,
        handleFocus: () => setIsFocused(true),
        handleBlur: () => setIsFocused(false),
        handleCursorUpdate: updateCursor,
        handleSelectSuggestion: applySuggestion,
    };
};
