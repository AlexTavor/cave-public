import React, { useMemo } from "react";
import { FieldContainer, Label } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { useNumberField } from "./useNumberField";
import { SliderMeta } from "./sliderMeta";
import { CompactInput, RangeInput, SliderRow } from "./SliderField.styles";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

interface SliderFieldProps extends FieldProps {
    sliderMeta: SliderMeta;
}

export const SliderField: React.FC<SliderFieldProps> = ({
    label,
    filename,
    path,
    sliderMeta,
    tooltip,
}) => {
    const {
        localValue,
        setLocalValue,
        handleBlur,
        handleKeyDown,
        commitValue,
    } = useNumberField(filename, path);

    const numericValue = useMemo(() => {
        const parsed = Number.parseFloat(localValue);
        if (Number.isNaN(parsed)) return sliderMeta.min;
        return parsed;
    }, [localValue, sliderMeta.min]);

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            <SliderRow>
                <RangeInput
                    type="range"
                    min={sliderMeta.min}
                    max={sliderMeta.max}
                    step={sliderMeta.step}
                    value={numericValue}
                    onChange={(e) => {
                        setLocalValue(e.target.value);
                        commitValue(e.target.value);
                    }}
                />
                <CompactInput
                    type="number"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
            </SliderRow>
        </FieldContainer>
    );
};
