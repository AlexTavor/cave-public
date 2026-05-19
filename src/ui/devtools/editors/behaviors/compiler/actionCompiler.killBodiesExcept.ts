import type { BehaviorAction } from "../../../../../data/schemas/behavior";

export const parseKillAllBodiesExceptAction = (
    tokens: string[],
): BehaviorAction => {
    const quantity = Number(tokens[1]);
    if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error(
            "KILL_ALL_BODIES_EXCEPT requires a non-negative integer quantity.",
        );
    }
    return { type: "KILL_ALL_BODIES_EXCEPT", quantity };
};
