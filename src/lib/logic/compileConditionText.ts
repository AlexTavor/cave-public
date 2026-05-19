import type { LogicToken } from "../../data/schemas/logic";
import { tokenizeSentence, toLogicToken } from "./tokenizer";
import { OPERATORS } from "./constants";

export type CompileConditionResult =
    | { ok: true; tokens: LogicToken[] }
    | { ok: false; error: string };

const isRefOrVal = (token: LogicToken): boolean =>
    token.t === "ref" || token.t === "val";

const isComparisonOp = (token: LogicToken): boolean =>
    token.t === "op" && OPERATORS.has(String(token.v));

const stripLeadingIF = (parts: string[]): string[] => {
    if (parts[0]?.toUpperCase() === "IF") return parts.slice(1);
    return parts;
};

export const compileConditionText = (input: string): CompileConditionResult => {
    const trimmed = input.trim();
    if (!trimmed) return { ok: true, tokens: [] };

    const parts = stripLeadingIF(tokenizeSentence(input));
    if (parts.length === 0) {
        return { ok: false, error: "Condition must be: <ref> <op> <value>." };
    }

    if (parts.length !== 3) {
        return {
            ok: false,
            error: `Condition must have exactly 3 parts (ref op value), got ${parts.length}.`,
        };
    }

    const tokens = parts.map(toLogicToken);
    const [left, op, right] = tokens;

    if (!isRefOrVal(left)) {
        return { ok: false, error: `Left side must be a ref or number.` };
    }
    if (!isComparisonOp(op)) {
        return { ok: false, error: `Middle must be a comparison operator.` };
    }
    if (!isRefOrVal(right)) {
        return { ok: false, error: `Right side must be a ref or number.` };
    }

    return { ok: true, tokens };
};
