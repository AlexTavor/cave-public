import type { LogicKeyword, LogicToken } from "../../data/schemas/logic";
import { LOGIC_KEYWORDS, OPERATORS } from "./constants";

const normalizeToken = (token: string): string => token.trim();

export const toLogicToken = (raw: string): LogicToken => {
    const trimmed = normalizeToken(raw);
    const upper = trimmed.toUpperCase();

    if (LOGIC_KEYWORDS.has(upper as LogicKeyword)) {
        return { t: "keyword", v: upper as LogicKeyword };
    }

    if (OPERATORS.has(upper)) {
        return { t: "op", v: upper };
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && trimmed !== "") {
        return { t: "val", v: numeric };
    }

    return { t: "ref", v: trimmed };
};

export const tokenizeSentence = (input: string): string[] =>
    input
        .trim()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
