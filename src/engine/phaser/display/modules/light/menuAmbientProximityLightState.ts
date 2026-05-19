import { BLEND_MODE_ADD } from "../../blendModes";
import { isRadiusVisible } from "../../../scenes/gameSceneMath";

const PROXIMITY_LIGHT_COLOR = "#683171";
const PROXIMITY_LIGHT_CUTOFF_PX = 200;

export type MenuAmbientProximityLightInput = {
    hasPhysics: boolean;
    nodeX: number;
    nodeY: number;
    pointerX: number;
    pointerY: number;
    radius: number;
};

export type MenuAmbientProximityLightState = {
    kind: "point";
    alpha: number;
    blendMode: number;
    color: string;
    radius: number;
    x: number;
    y: number;
};

export const resolveMenuAmbientProximityLightState = (
    input: MenuAmbientProximityLightInput,
): MenuAmbientProximityLightState | null => {
    if (
        !input.hasPhysics ||
        !isRadiusVisible(input.radius) ||
        !Number.isFinite(input.pointerX) ||
        !Number.isFinite(input.pointerY)
    ) {
        return null;
    }
    const distance = Math.hypot(
        input.pointerX - input.nodeX,
        input.pointerY - input.nodeY,
    );
    if (distance >= PROXIMITY_LIGHT_CUTOFF_PX) return null;
    return {
        kind: "point",
        alpha: Math.max(
            0,
            Math.min(1, 1 - distance / PROXIMITY_LIGHT_CUTOFF_PX),
        ),
        blendMode: BLEND_MODE_ADD,
        color: PROXIMITY_LIGHT_COLOR,
        radius: input.radius,
        x: input.nodeX,
        y: input.nodeY,
    };
};
