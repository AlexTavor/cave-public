import type { DisplayStyle } from "./styles";

export const createDefaultDisplayStyle = (): DisplayStyle => ({
    cycleProgress: {
        family: "circle",
        familyRotationDeg: 0,
        color: "#ffffff",
    },
});
