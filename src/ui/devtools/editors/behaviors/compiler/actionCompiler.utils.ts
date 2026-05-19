export const splitByKeyword = (
    tokens: string[],
    keyword: string,
): string[][] => {
    const groups: string[][] = [];
    let current: string[] = [];

    for (const token of tokens) {
        if (token.toUpperCase() === keyword) {
            if (current.length > 0) {
                groups.push(current);
            }
            current = [];
            continue;
        }
        current.push(token);
    }

    if (current.length > 0) {
        groups.push(current);
    }

    return groups;
};

const unwrapParens = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        return trimmed.slice(1, -1).trim();
    }
    return trimmed;
};

export const parseActionValue = (token: string): number | string => {
    const normalized = unwrapParens(token);
    const numeric = Number(normalized);
    if (!Number.isNaN(numeric) && normalized !== "") return numeric;
    return normalized;
};
