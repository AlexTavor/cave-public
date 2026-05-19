import {
    type AttributeDisplayPaletteKey,
    DisplayPaletteKey,
} from "../../../../lib/displays/displayKeyKinds";
import type { GlyphConfigWithoutId } from "./GlyphGenerator";

export const resolveAttributePoolKey = (
    displayKey: string,
): AttributeDisplayPaletteKey | null => {
    switch (displayKey) {
        case "attr_body":
            return DisplayPaletteKey.Body;
        case "attr_mind":
            return DisplayPaletteKey.Mind;
        case "attr_social":
            return DisplayPaletteKey.Social;
        default:
            return null;
    }
};

export const resolvePowerShape = (attribute: string) => {
    switch (attribute) {
        case "body":
            return "plus_rounded" as const;
        case "mind":
            return "chevron_up_rounded" as const;
        case "social":
            return "triple_circle" as const;
        default:
            return "circle" as const;
    }
};

export const buildAttributePoolGlyph = (
    displayKey: string,
): GlyphConfigWithoutId | null => {
    const attribute = resolveAttributePoolKey(displayKey);
    if (!attribute) return null;
    return {
        placements: [
            {
                shape: resolvePowerShape(attribute),
                position: 4,
                rotationDeg: 0,
                scale: 1,
                colorHex: "#ffffff",
                paletteColorKey: attribute,
                radialPositionFactor: 1,
            },
        ],
        pulse: {
            distanceFromCenterMinFactor: 0.4,
            distanceFromCenterMaxFactor: 0.8,
            scalePulseMin: 0.95,
            scalePulseMax: 1.05,
            rotationDeltaMinDeg: 0,
            rotationDeltaMaxDeg: 0,
            delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
    };
};
