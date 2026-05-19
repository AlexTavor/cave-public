import type { BehaviorAction } from "../../../../../data/schemas/behavior";
import { parseActionValue } from "./actionCompiler.utils";

export const parseTransferAction = (tokens: string[]): BehaviorAction => {
    if (tokens.length < 7) {
        throw new Error("TRANSFER action is incomplete.");
    }

    const amount = parseActionValue(tokens[1] ?? "");
    const resource = tokens[2] ?? "";
    const fromIndex = tokens.findIndex((t) => t.toUpperCase() === "FROM");
    const toIndex = tokens.findIndex((t) => t.toUpperCase() === "TO");

    if (fromIndex < 0 || toIndex < 0 || fromIndex > toIndex) {
        throw new Error("TRANSFER action must include FROM and TO.");
    }

    const source = tokens[fromIndex + 1];
    const target = tokens[toIndex + 1];

    if (!resource || !source || !target) {
        throw new Error(
            "TRANSFER action requires amount, resource, source, target.",
        );
    }

    return {
        type: "TRANSFER",
        source,
        target,
        resource,
        amount,
    };
};
