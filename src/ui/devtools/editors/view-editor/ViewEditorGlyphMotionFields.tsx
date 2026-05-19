import React from "react";
import {
    FieldLabel,
    RangeInput,
    TextInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorGlyphMotionFields: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => {
    const { glyph } = editor;
    const position = glyph.selectedPosition;
    const animation = glyph.selectedPlacement.animation;
    const motionFields = [
        [
            "Distance Min",
            "Minimum orbit distance reached during the pulse.",
            "0",
            "1",
            "0.01",
            animation.distanceFromCenterMinFactor,
            glyph.updateDistanceMin,
        ],
        [
            "Distance Max",
            "Maximum orbit distance reached during the pulse.",
            "0",
            "1",
            "0.01",
            animation.distanceFromCenterMaxFactor,
            glyph.updateDistanceMax,
        ],
        [
            "Scale Pulse Min",
            "Minimum scale multiplier used during the pulse.",
            "0.1",
            "2",
            "0.01",
            animation.scalePulseMin,
            glyph.updateScalePulseMin,
        ],
        [
            "Scale Pulse Max",
            "Maximum scale multiplier used during the pulse.",
            "0.1",
            "2",
            "0.01",
            animation.scalePulseMax,
            glyph.updateScalePulseMax,
        ],
        [
            "Rotation Delta Min",
            "Minimum rotation offset added during the pulse.",
            "-180",
            "180",
            "1",
            animation.rotationDeltaMinDeg,
            glyph.updateRotationDeltaMin,
        ],
        [
            "Rotation Delta Max",
            "Maximum rotation offset added during the pulse.",
            "-180",
            "180",
            "1",
            animation.rotationDeltaMaxDeg,
            glyph.updateRotationDeltaMax,
        ],
    ] as const;
    return (
        <>
            {motionFields.map(
                ([label, title, min, max, step, value, update]) => (
                    <FieldLabel key={label}>
                        {label}
                        <RangeInput
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            title={title}
                            value={value}
                            onChange={(e) =>
                                update(position, Number(e.target.value))
                            }
                        />
                    </FieldLabel>
                ),
            )}
            <FieldLabel>
                Reverse Direction
                <TextInput
                    type="checkbox"
                    title="Play this slot's pulse in reverse so it uses 1 - pulse."
                    checked={Boolean(animation.reverseDirection)}
                    onChange={(e) =>
                        glyph.updateReverseDirection(position, e.target.checked)
                    }
                />
            </FieldLabel>
        </>
    );
};
