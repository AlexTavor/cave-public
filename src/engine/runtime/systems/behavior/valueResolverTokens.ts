export type ResolverToken = { type: "literal" | "op"; value: string };

const numberChar = /[0-9.]/;

const isOperator = (char: string): boolean =>
    char === "+" || char === "-" || char === "*" || char === "/";

const isWhitespace = (char: string): boolean => char.trim() === "";

const isNumberChar = (char: string | undefined): boolean =>
    Boolean(char && numberChar.exec(char));

const isUnaryMinus = (
    char: string,
    prev: ResolverToken | undefined,
    next: string | undefined,
): boolean =>
    char === "-" &&
    (!prev || prev.value === "(" || prev.type === "op") &&
    isNumberChar(next);

const readNumber = (
    expression: string,
    startIndex: number,
): { value: string; nextIndex: number } => {
    let literal = "-";
    let index = startIndex + 1;
    while (index < expression.length) {
        const part = expression[index];
        if (!isNumberChar(part)) break;
        literal += part;
        index += 1;
    }
    return { value: literal, nextIndex: index };
};

const readLiteral = (
    expression: string,
    startIndex: number,
): { value: string; nextIndex: number } => {
    let literal = "";
    let index = startIndex;
    while (index < expression.length) {
        const part = expression[index];
        if (!part || isWhitespace(part) || isOperator(part)) break;
        if (part === "(" || part === ")") break;
        literal += part;
        index += 1;
    }
    return { value: literal, nextIndex: index };
};

export const tokenizeExpression = (expression: string): ResolverToken[] => {
    const tokens: ResolverToken[] = [];
    let index = 0;
    while (index < expression.length) {
        const char = expression[index];
        if (!char || isWhitespace(char)) {
            index += 1;
            continue;
        }
        const prev = tokens.at(-1);
        const next = expression[index + 1];
        if (isUnaryMinus(char, prev, next)) {
            const numberToken = readNumber(expression, index);
            tokens.push({ type: "literal", value: numberToken.value });
            index = numberToken.nextIndex;
            continue;
        }

        if (char === "(" || char === ")") {
            tokens.push({ type: "op", value: char });
            index += 1;
            continue;
        }

        if (isOperator(char)) {
            tokens.push({ type: "op", value: char });
            index += 1;
            continue;
        }

        const literalToken = readLiteral(expression, index);
        if (literalToken.value) {
            tokens.push({ type: "literal", value: literalToken.value });
        }
        index = literalToken.nextIndex;
    }

    return tokens;
};
