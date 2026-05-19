import React from "react";
import { FieldLabel, RangeInput } from "./BlueprintVisualsModal.styles";
import type { GlyphVisualInspectorProps } from "./GlyphVisualInspector.types";

export const GlyphVisualMotionFields: React.FC<{
    props: GlyphVisualInspectorProps;
}> = ({ props }) => {
    const { animation } = props.selectedPlacement;
    const position = props.selectedPosition;
    return (
        <>
            <FieldLabel>
                Distance Min
                <RangeInput
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={animation.distanceFromCenterMinFactor}
                    onChange={(e) =>
                        props.updateDistanceMin(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Distance Max
                <RangeInput
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={animation.distanceFromCenterMaxFactor}
                    onChange={(e) =>
                        props.updateDistanceMax(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Scale Pulse Min
                <RangeInput
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.01"
                    value={animation.scalePulseMin}
                    onChange={(e) =>
                        props.updateScalePulseMin(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Scale Pulse Max
                <RangeInput
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.01"
                    value={animation.scalePulseMax}
                    onChange={(e) =>
                        props.updateScalePulseMax(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Rotation Delta Min
                <RangeInput
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={animation.rotationDeltaMinDeg}
                    onChange={(e) =>
                        props.updateRotationDeltaMin(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            <FieldLabel>
                Rotation Delta Max
                <RangeInput
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={animation.rotationDeltaMaxDeg}
                    onChange={(e) =>
                        props.updateRotationDeltaMax(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
        </>
    );
};
