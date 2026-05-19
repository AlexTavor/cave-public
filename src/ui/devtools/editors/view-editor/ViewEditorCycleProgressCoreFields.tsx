import React from "react";
import {
    FieldLabel,
    RangeInput,
    SelectInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";

const FAMILIES = [
    "none",
    "circle",
    "triangle",
    "square",
    "hex",
    "spiky_circle",
];

export const ViewEditorCycleProgressCoreFields: React.FC<{
    cycleProgress: NonNullable<ViewEditorAdapter["cycleProgress"]>;
}> = ({ cycleProgress }) => {
    const showPreviewSlider =
        typeof cycleProgress.previewProgress === "number" &&
        Boolean(cycleProgress.updatePreviewProgress);
    return (
        <>
            <FieldLabel>
                Family
                <SelectInput
                    value={cycleProgress.family}
                    onChange={(e) => cycleProgress.updateFamily(e.target.value)}
                >
                    {FAMILIES.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </SelectInput>
            </FieldLabel>
            <FieldLabel>
                Family Rotation
                <RangeInput
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={cycleProgress.familyRotationDeg}
                    onChange={(e) =>
                        cycleProgress.updateFamilyRotation(
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
            {showPreviewSlider ? (
                <FieldLabel>
                    Preview Progress
                    <RangeInput
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={cycleProgress.previewProgress}
                        onChange={(e) =>
                            cycleProgress.updatePreviewProgress?.(
                                Number(e.target.value),
                            )
                        }
                    />
                </FieldLabel>
            ) : null}
        </>
    );
};
