import type { LogicToken } from "../../data/schemas/logic";
import { LogicCompileError } from "./errors";

const OP_MAP: Record<string, string> = {
    "=": "==",
    "==": "==",
    EQ: "==",
    "!=": "!=",
    NEQ: "!=",
    ">": ">",
    GT: ">",
    "<": "<",
    LT: "<",
    ">=": ">=",
    GTE: ">=",
    "<=": "<=",
    LTE: "<=",
    "+": "+",
    "-": "-",
    "*": "*",
    "/": "/",
    ADD: "+",
    SUB: "-",
    MULT: "*",
    DIV: "/",
};

const normalizeRef = (ref: string): string => {
    if (ref.startsWith("self.")) return `self.${ref.slice(5)}`;
    if (ref.startsWith("global.")) return `globals.${ref.slice(7)}`;
    if (ref.startsWith("globals.")) return `globals.${ref.slice(8)}`;
    return ref;
};

const tokenToAtom = (token: LogicToken): unknown => {
    if (token.t === "val") return token.v;
    if (token.t === "ref") return { var: normalizeRef(token.v) };
    throw new LogicCompileError(`Unexpected token '${token.t}' in expression.`);
};

export const compileExpression = (tokens: LogicToken[]): unknown => {
    if (tokens.length === 0) {
        throw new LogicCompileError("Logic expression is empty.");
    }

    const requireToken = (idx: number): LogicToken => {
        const token = tokens[idx];
        if (!token) {
            throw new LogicCompileError("Logic expression is incomplete.");
        }
        return token;
    };

    let index = 0;

    const consumeAtom = (): unknown => {
        const token = requireToken(index);
        if (token.t === "keyword" && token.v === "NOT") {
            index += 1;
            const operand = consumeAtom();
            return { "!": operand };
        }

        const atom = tokenToAtom(token);
        index += 1;
        return atom;
    };

    let current = consumeAtom();

    while (index < tokens.length) {
        const token = tokens[index];
        if (token.t === "keyword") {
            if (token.v !== "AND" && token.v !== "OR") {
                throw new LogicCompileError(
                    `Unsupported keyword '${token.v}'.`,
                );
            }
            index += 1;
            const right = consumeAtom();
            current = {
                [token.v === "AND" ? "and" : "or"]: [current, right],
            };
            continue;
        }

        if (token.t === "op") {
            const op = OP_MAP[token.v] ?? token.v;
            index += 1;
            const right = tokenToAtom(requireToken(index));
            index += 1;
            current = { [op]: [current, right] };
            continue;
        }

        throw new LogicCompileError(`Unexpected token '${token.t}'.`);
    }

    return current;
};
