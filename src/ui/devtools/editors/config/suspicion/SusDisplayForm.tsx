import React from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { StringField } from "../../fields/string-field/StringField";
import { NumberField } from "../../fields/number-field/NumberField";
import { SliderField } from "../../fields/number-field/SliderField";
import { SusDisplayColorField } from "./SusDisplayColorField";

const thresholdSlider = { min: 0, max: 1, step: 0.01 };

export const SusDisplayForm: React.FC<{
    filename: string;
    basePath: string;
    index: number;
    onRemove: () => void;
    thresholdMode?: "absolute" | "fraction";
}> = ({ filename, basePath, index, onRemove, thresholdMode = "absolute" }) => {
    const isFraction = thresholdMode === "fraction";
    return (
        <ComponentRow
            title={`Display ${index + 1}`}
            titleTooltip={`Configure the text, color, and ${isFraction ? "purge-progress fraction" : "purge-progress amount"} for this display rule.`}
            defaultOpen={index === 0}
            onDelete={onRemove}
            deleteLabel="Remove Display"
        >
            <StringField
                label="Text"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.text`}
                tooltip="Text shown for this display rule."
            />
            <SusDisplayColorField
                filename={filename}
                path={`${basePath}.color`}
                label="Color"
                tooltip="Hex color used for this display rule."
            />
            {isFraction ? (
                <SliderField
                    label="Threshold"
                    schema={z.number().min(0).max(1)}
                    filename={filename}
                    path={`${basePath}.threshold`}
                    sliderMeta={thresholdSlider}
                    tooltip="Minimum fraction of total Purge Progress required for this display rule."
                />
            ) : (
                <NumberField
                    label="Threshold"
                    schema={z.number().min(0)}
                    filename={filename}
                    path={`${basePath}.threshold`}
                    tooltip="Minimum Purge Progress amount required for this display rule."
                />
            )}
        </ComponentRow>
    );
};
