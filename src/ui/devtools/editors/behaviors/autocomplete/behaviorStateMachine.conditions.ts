import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import {
    ARITHMETIC_OPERATORS,
    COMPARISON_OPERATORS,
    CONDITION_KEYWORDS,
} from "./behaviorStateMachine.constants";
import { getReferenceNode } from "./behaviorStateMachine.references";

const isComparisonOperator = (token: string): boolean =>
    COMPARISON_OPERATORS.includes(token);

const isKeywordToken = (token: string): boolean => {
    const upper = token.toUpperCase();
    return upper === "WHEN" || upper === "DO" || CONDITION_KEYWORDS.has(upper);
};

export const shouldSuggestConditionBoundary = (
    tokens: string[],
    currentToken: string,
    previousToken: string,
    moduleData: ModuleCartridge | null,
    draft: Blueprint | null,
): boolean => {
    if (currentToken) return false;
    if (!previousToken) return false;

    const first = tokens[0]?.toUpperCase();
    if (first !== "WHEN") return false;
    if (tokens.some((token) => token.toUpperCase() === "DO")) return false;

    const lastIndex = tokens.lastIndexOf(previousToken);
    if (lastIndex < 2) return false;

    const refToken = tokens[lastIndex - 2];
    const opToken = tokens[lastIndex - 1];
    const valueToken = tokens[lastIndex];

    if (!refToken || !opToken || !valueToken) return false;
    if (!isComparisonOperator(opToken)) return false;
    if (isKeywordToken(valueToken)) return false;
    if (ARITHMETIC_OPERATORS.includes(valueToken)) return false;

    return Boolean(getReferenceNode(refToken, moduleData, draft));
};

export const shouldAllowArithmetic = (tokens: string[]): boolean => {
    const doIndex = tokens.findIndex((token) => token.toUpperCase() === "DO");
    if (doIndex < 0) return false;
    const verb = tokens[doIndex + 1]?.toUpperCase();
    return (
        verb === "SET" ||
        verb === "ADD" ||
        verb === "SUB" ||
        verb === "MULT" ||
        verb === "DIV"
    );
};
