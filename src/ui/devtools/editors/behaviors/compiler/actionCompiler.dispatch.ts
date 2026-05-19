import type { BehaviorAction } from "../../../../../data/schemas/behavior";

export const parseDispatchAction = (tokens: string[]): BehaviorAction => {
    const toIndex = tokens.findIndex((t) => t.toUpperCase() === "TO");
    if (toIndex < 0) {
        throw new Error("DISPATCH action must include TO.");
    }

    const entity = tokens[1];
    const target = tokens[toIndex + 1];

    if (!entity || !target) {
        throw new Error("DISPATCH action requires entity and target.");
    }

    return {
        type: "DISPATCH",
        entity,
        target,
    };
};
