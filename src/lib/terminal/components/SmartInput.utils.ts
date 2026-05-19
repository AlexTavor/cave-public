export interface TokenRange {
    start: number;
    end: number;
}

const MULTIPART_SEPARATOR = "::";

export const getTokenRangeAtCursor = (
    value: string,
    cursor: number,
): TokenRange => {
    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const tokenRegex = /\S+/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(value)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (safeCursor >= start && safeCursor <= end) {
            return { start, end };
        }
    }

    return { start: safeCursor, end: safeCursor };
};

export const shouldAppendTrailingSpace = (insertText: string): boolean => {
    if (insertText.endsWith(" ")) return false;
    if (insertText.endsWith(MULTIPART_SEPARATOR)) return false;
    if (insertText.endsWith(".")) return false;
    return true;
};
