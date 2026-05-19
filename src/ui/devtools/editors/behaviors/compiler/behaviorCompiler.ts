import { nanoid } from "nanoid";
import { ulid } from "ulid";
import type { BehaviorRule } from "../../../../../data/schemas/behavior";
import type { LogicRule } from "../../../../../data/schemas/logic";
import { parseAction } from "./actionCompiler";
import { toLogicToken } from "./tokenizer";

const splitByKeyword = (tokens: string[], keyword: string): string[][] => {
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

const compileCondition = (tokens: string[]): LogicRule => {
    return {
        id: nanoid(),
        sortKey: ulid(),
        tokens: tokens.map(toLogicToken),
    };
};

export const compileBehaviorRule = (tokens: string[]): BehaviorRule => {
    if (tokens.length < 3) {
        throw new Error("Behavior sentence is incomplete.");
    }

    if (tokens[0].toUpperCase() !== "WHEN") {
        throw new Error("Behavior sentence must start with WHEN.");
    }

    const doIndex = tokens.findIndex((token) => token.toUpperCase() === "DO");
    if (doIndex < 0) {
        throw new Error("Behavior sentence must include DO.");
    }

    const conditionTokens = tokens.slice(1, doIndex);
    const actionTokens = tokens.slice(doIndex + 1);

    if (conditionTokens.length === 0) {
        throw new Error("Behavior sentence requires a condition.");
    }

    if (actionTokens.length === 0) {
        throw new Error("Behavior sentence requires an action.");
    }

    const conditions = splitByKeyword(conditionTokens, "AND").map(
        compileCondition,
    );

    const actions = splitByKeyword(actionTokens, "AND").map(parseAction);

    return {
        id: nanoid(),
        sortKey: ulid(),
        conditions,
        actions,
    };
};
