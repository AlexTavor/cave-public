import type { GainHabitiAction } from "../../../../../data/schemas/behavior";

export const parseGainHabitiAction = (tokens: string[]): GainHabitiAction => {
    const habitusId = tokens[1];
    if (!habitusId) {
        throw new Error("GAIN_HABITI action requires a habitus id.");
    }
    return {
        type: "GAIN_HABITI",
        habitusId,
    };
};
