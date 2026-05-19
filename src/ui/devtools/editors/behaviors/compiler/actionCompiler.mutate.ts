import type { BehaviorAction } from "../../../../../data/schemas/behavior";
import { parseActionValue } from "./actionCompiler.utils";

export const parseMutateAction = (tokens: string[]): BehaviorAction => {
    if (tokens.length < 3) {
        throw new Error("Mutate action is incomplete.");
    }

    const op = tokens[0].toUpperCase();
    if (op !== "SET" && op !== "ADD" && op !== "SUB") {
        throw new Error("Unknown mutate verb.");
    }

    const target = tokens[1];
    const valueToken = tokens.slice(2).join(" ");

    if (!target || !valueToken) {
        throw new Error("Mutate action requires target and value.");
    }

    return {
        type: "MUTATE",
        target,
        op,
        value: parseActionValue(valueToken),
    };
};
