import { useCallback, useEffect, useState } from "react";
import { CommandRegistry } from "../Registry";
import { ExecutionContextInput, Suggestion } from "../types";

const EMPTY_CONTEXT: ExecutionContextInput = {};

interface UseSmartInputProps {
    registry: CommandRegistry;
    initialValue?: string;
    context?: ExecutionContextInput;
}

const areSuggestionsEqual = (left: Suggestion[], right: Suggestion[]) => {
    if (left.length !== right.length) return false;
    return left.every((item, index) => {
        const other = right[index];
        return (
            item.label === other.label &&
            item.type === other.type &&
            item.insertText === other.insertText
        );
    });
};

export const useSmartInput = ({
    registry,
    initialValue = "",
    context,
}: UseSmartInputProps) => {
    const effectiveContext = context ?? EMPTY_CONTEXT;
    const [input, setInput] = useState(initialValue);
    const [cursorPosition, setCursorPositionState] = useState(
        initialValue.length,
    );
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    const getContext = useCallback(
        (cursor: number) =>
            ({
                ...effectiveContext,
                cursorPosition: cursor,
            }) as ExecutionContextInput,
        [effectiveContext],
    );

    const handleInputChange = useCallback((val: string) => {
        setInput(val);
    }, []);

    const setCursorPosition = useCallback((cursor: number) => {
        setCursorPositionState(cursor);
    }, []);

    useEffect(() => {
        const nextSuggestions = registry.getSuggestions(
            input,
            getContext(cursorPosition),
        );
        setSuggestions((currentSuggestions) =>
            areSuggestionsEqual(currentSuggestions, nextSuggestions)
                ? currentSuggestions
                : nextSuggestions,
        );
    }, [registry, input, getContext, cursorPosition]);

    const clear = useCallback(() => {
        setInput("");
        setCursorPositionState(0);
        setSuggestions([]);
    }, []);

    return {
        input,
        setInput: handleInputChange,
        setCursorPosition,
        suggestions,
        clear,
        // Helper to check if the current input exactly matches a known command/rule
        isValid: suggestions.some((s) => s.label === input.trim()),
    };
};
