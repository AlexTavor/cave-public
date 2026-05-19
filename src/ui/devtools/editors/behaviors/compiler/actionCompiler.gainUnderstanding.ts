import type { GainUnderstandingAction } from "../../../../../data/schemas/behavior";

export const parseGainUnderstandingAction = (
    tokens: string[],
): GainUnderstandingAction => {
    const understandingId = tokens[1];
    if (!understandingId) {
        throw new Error(
            "GAIN_UNDERSTANDING action requires an understanding id.",
        );
    }
    return {
        type: "GAIN_UNDERSTANDING",
        understandingId,
    };
};
