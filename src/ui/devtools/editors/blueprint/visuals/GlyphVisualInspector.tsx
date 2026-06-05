import React from "react";
import { ALL_GLYPH_SHAPES } from "../../../../../data/schemas/assets/GlyphTypes";
import { Button } from "../../../../lib/atoms/button";
import { GlyphVisualMotionFields } from "./GlyphVisualMotionFields";
import type { GlyphVisualInspectorProps } from "./GlyphVisualInspector.types";
import {
    FieldLabel,
    RangeInput,
    SelectInput,
    TextInput,
} from "./BlueprintVisualsModal.styles";

export const GlyphVisualInspector: React.FC<GlyphVisualInspectorProps> = (
    props,
) => {
    return (
        <>
            <FieldLabel>
                Shape
                <SelectInput
                    value={props.selectedPlacement.shape}
                    onChange={(e) =>
                        props.updateShape(
                            props.selectedPosition,
                            e.target.value,
                        )
                    }
                >
                    {ALL_GLYPH_SHAPES.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </SelectInput>
            </FieldLabel>
            <FieldLabel>
                Base Color
                <TextInput
                    type="color"
                    value={props.selectedPlacement.colorHex}
                    onChange={(e) =>
                        props.updateColor(
                            props.selectedPosition,
                            e.target.value,
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Base Scale
                <RangeInput
                    type="range"
                    min="0.1"
                    max="4"
                    step="0.1"
                    value={props.selectedPlacement.scale}
                    onChange={(e) =>
                        props.updateScale(
                            props.selectedPosition,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Base Rotation
                <RangeInput
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={props.selectedPlacement.rotationDeg}
                    onChange={(e) =>
                        props.updateRotation(
                            props.selectedPosition,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Radial Position
                <RangeInput
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={props.selectedPlacement.radialPositionFactor}
                    onChange={(e) =>
                        props.updateRadialPosition(
                            props.selectedPosition,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <GlyphVisualMotionFields props={props} />
            {props.selectedPlacement.enabled ? (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                        props.removePlacement(props.selectedPosition)
                    }
                >
                    Remove Placement
                </Button>
            ) : null}
        </>
    );
};
