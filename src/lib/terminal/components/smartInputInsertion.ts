import type { Suggestion } from "../types";
import {
    getTokenRangeAtCursor,
    shouldAppendTrailingSpace,
    type TokenRange,
} from "./SmartInput.utils";

export interface SuggestionInsertionResult {
    nextValue: string;
    cursor: number;
}

const normalizeRange = (
    range: TokenRange | NonNullable<Suggestion["replace"]>,
): TokenRange => {
    if ("start" in range) return range;
    return { start: range.from, end: range.to };
};

const shouldPrefixSpace = (
    value: string,
    rangeStart: number,
    insertText: string,
): boolean => {
    if (rangeStart <= 0) return false;
    if (insertText.startsWith(" ") || insertText.startsWith(".")) return false;
    if (rangeStart >= value.length) return value[rangeStart - 1] !== " ";
    return value[rangeStart - 1] !== " ";
};

const applyLeadingSpace = (
    value: string,
    rangeStart: number,
    insertText: string,
    isInsert: boolean,
): string => {
    if (!isInsert) return insertText;
    if (!shouldPrefixSpace(value, rangeStart, insertText)) return insertText;
    return ` ${insertText}`;
};

export const applySuggestionToValue = (
    value: string,
    suggestion: Suggestion,
    cursor: number,
): SuggestionInsertionResult => {
    const range = normalizeRange(
        suggestion.replace ?? getTokenRangeAtCursor(value, cursor),
    );
    const isInsert = range.start === range.end;
    const rawInsert = suggestion.insertText ?? suggestion.label;
    const insertText = applyLeadingSpace(
        value,
        range.start,
        rawInsert,
        isInsert,
    );
    const prefix = value.slice(0, range.start);
    const suffix = value.slice(range.end);

    let nextValue = `${prefix}${insertText}${suffix}`;
    let cursorAfterInsert = prefix.length + insertText.length;

    if (shouldAppendTrailingSpace(insertText)) {
        const nextChar = nextValue[cursorAfterInsert];
        if (nextChar !== " ") {
            nextValue = `${nextValue.slice(0, cursorAfterInsert)} ${nextValue.slice(cursorAfterInsert)}`;
            cursorAfterInsert += 1;
        }
    }

    const finalCursor = suggestion.cursor?.at ?? cursorAfterInsert;
    return { nextValue, cursor: finalCursor };
};
