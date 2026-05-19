import { useMemo } from "react";
import type { Suggestion } from "../../../../../lib/terminal/types";

const ACTION_KEYWORDS = [
    "SET",
    "ADD",
    "SUB",
    "TRANSFER",
    "DISPATCH",
    "SPAWN",
    "SPAWN_BODY",
    "KILL",
    "GAIN_HABITI",
    "GAIN_UNDERSTANDING",
    "ADD_TRAIT",
    "REMOVE_TRAIT",
    "SHOW_CINEMATIC",
    "AND",
    "FROM",
    "TO",
];

const getCursorToken = (value: string, cursor: number): string => {
    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(value)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (safeCursor >= start && safeCursor <= end) {
            return match[0];
        }
    }

    return "";
};

export const useActionAutocomplete = (
    input: string,
    cursor: number,
): Suggestion[] => {
    return useMemo(() => {
        const currentToken = getCursorToken(input, cursor);
        const normalized = currentToken.toLowerCase();
        const filtered = ACTION_KEYWORDS.filter((keyword) =>
            keyword.toLowerCase().startsWith(normalized),
        );

        return filtered.map((label) => ({
            label,
            type: "command",
            insertText: label,
        }));
    }, [cursor, input]);
};

