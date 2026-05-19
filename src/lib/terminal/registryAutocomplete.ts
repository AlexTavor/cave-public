interface AutocompleteContext {
    lineInput: string;
    parts: string[];
    isTypingCommand: boolean;
}

const getLineInputAtCursor = (input: string, cursorPosition?: number) => {
    const safeCursor = Math.max(
        0,
        Math.min(cursorPosition ?? input.length, input.length),
    );
    const beforeCursor = input.slice(0, safeCursor);
    const lineStart = beforeCursor.lastIndexOf("\n") + 1;
    return beforeCursor.slice(lineStart);
};

export const getAutocompleteContext = (
    input: string,
    cursorPosition?: number,
): AutocompleteContext | null => {
    const lineInput = getLineInputAtCursor(input, cursorPosition);
    if (lineInput.includes("#")) return null;
    const normalized = lineInput.replace(/^\s+/, "");
    const parts = normalized.split(/\s+/);
    return {
        lineInput,
        parts,
        isTypingCommand: parts.length === 1 && !lineInput.endsWith(" "),
    };
};
