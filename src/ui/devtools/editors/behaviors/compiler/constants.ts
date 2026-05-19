import type { LogicKeyword } from "../../../../../data/schemas/logic";
import {
    LOGIC_KEYWORDS as SHARED_LOGIC_KEYWORDS,
    OPERATORS as SHARED_OPERATORS,
} from "../../../../../lib/logic/constants";

export type EditorVerb =
    | "WHEN"
    | "SET"
    | "ADD"
    | "SUB"
    | "TRANSFER"
    | "DISPATCH"
    | "SPAWN"
    | "SPAWN_BODY"
    | "KILL"
    | "KILL_ALL_BODIES_EXCEPT"
    | "ADD_TRAIT"
    | "REMOVE_TRAIT"
    | "GAIN_HABITI"
    | "GAIN_UNDERSTANDING";

export type ArithmeticVerb = "ADD" | "SUB";

export const LOGIC_KEYWORDS = new Set<LogicKeyword>(SHARED_LOGIC_KEYWORDS);

export const OPERATORS = new Set<string>(SHARED_OPERATORS);

const ARITHMETIC_VERBS = new Set<ArithmeticVerb>(["ADD", "SUB"]);

export const isArithmeticVerb = (verb: string): verb is ArithmeticVerb =>
    ARITHMETIC_VERBS.has(verb as ArithmeticVerb);

export const VERB_TO_OP: Record<ArithmeticVerb, string> = {
    ADD: "+",
    SUB: "-",
};

