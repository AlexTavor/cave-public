export const ROOT_KEYWORDS = ["WHEN"] as const;

export const EFFECT_VERBS = [
    "SET",
    "ADD",
    "SUB",
    "TRANSFER",
    "DISPATCH",
    "SPAWN",
    "KILL",
    "KILL_ALL_BODIES_EXCEPT",
    "GAIN_HABITI",
    "GAIN_UNDERSTANDING",
] as const;

export const COMPARISON_OPERATORS = [">", "<", "=", "!=", ">=", "<="];
export const ARITHMETIC_OPERATORS = ["+", "-", "*", "/"];
export const EQUALITY_OPERATORS = ["=", "!="];
export const CONDITION_KEYWORDS = new Set(["AND", "OR", "NOT"]);

