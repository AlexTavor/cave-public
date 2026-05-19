import type { LogicToken } from "../../../../data/schemas/logic";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../utils/objectUtils";

const KEYWORDS = new Set(["IF", "AND", "OR", "NOT"]);
const OPERATORS = new Set([
    "=",
    ">",
    "<",
    ">=",
    "<=",
    "==",
    "!=",
    "+",
    "-",
    "*",
    "/",
    "ADD",
    "SUB",
    "MULT",
    "DIV",
]);

const parseToken = (raw: string): LogicToken => {
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();

    if (KEYWORDS.has(upper)) {
        return { t: "keyword", v: upper as LogicToken["v"] } as LogicToken;
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

export const parseTokensFromInput = (input: string): LogicToken[] => {
    return input
        .split(/\s+/)
        .filter((token) => token.length > 0)
        .map(parseToken);
};

export const applyLogicTokens = (
    filename: string,
    rulePath: string,
    input: string,
    mode: "append" | "replace" = "append",
): void => {
    const tokens = parseTokensFromInput(input);
    if (tokens.length === 0) return;

    const updateDraft = useSessionStore.getState().updateDraft;
    updateDraft(filename, (draft) => {
        const rule = getByPath(draft, rulePath) as { tokens?: LogicToken[] };
        const currentTokens = Array.isArray(rule?.tokens) ? rule.tokens : [];
        const nextTokens =
            mode === "append" ? [...currentTokens, ...tokens] : tokens;
        setByPath(draft, `${rulePath}.tokens`, nextTokens);
    });
};

export const clearLogicTokens = (filename: string, rulePath: string): void => {
    const updateDraft = useSessionStore.getState().updateDraft;
    updateDraft(filename, (draft) => {
        setByPath(draft, `${rulePath}.tokens`, []);
    });
};
