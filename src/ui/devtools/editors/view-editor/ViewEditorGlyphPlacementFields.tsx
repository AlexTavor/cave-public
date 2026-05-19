import React from "react";
import {
    FieldLabel,
    RangeInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";

const RANGE_FIELDS = [
    ["Base Scale", "Set the slot's resting glyph scale.", "0.1", "4", "0.1"],
    [
        "Base Rotation",
        "Set the slot's resting rotation in degrees.",
        "0",
        "360",
        "1",
    ],
    [
        "Radial Position",
        "Move the slot inward or outward from the center.",
        "0",
        "1",
        "0.01",
    ],
] as const;

export const ViewEditorGlyphPlacementFields: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => {
    const { glyph } = editor;
    const position = glyph.selectedPosition;
    const current = glyph.selectedPlacement;
    const values = [
        current.scale,
        current.rotationDeg,
        current.radialPositionFactor,
    ];
    const updates = [
        glyph.updateScale,
        glyph.updateRotation,
        glyph.updateRadialPosition,
    ];
    return (
        <>
            {RANGE_FIELDS.map(([label, title, min, max, step], index) => (
                <FieldLabel key={label}>
                    {label}
                    <RangeInput
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        title={title}
                        value={values[index]}
                        onChange={(e) =>
                            updates[index](position, Number(e.target.value))
                        }
                    />
                </FieldLabel>
            ))}
        </>
    );
};
