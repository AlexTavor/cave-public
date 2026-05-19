import type { LogicKeyword } from "../../data/schemas/logic";

export const LOGIC_KEYWORDS = new Set<LogicKeyword>(["IF", "AND", "OR", "NOT"]);

export const OPERATORS = new Set<string>([
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
