import React from "react";
import { FieldProps } from "./Shared.types";
import { IconPicker } from "./icon-picker/IconPicker";
import { NumberField } from "./number-field/NumberField";
import { SliderField } from "./number-field/SliderField";
import { parseSliderMeta } from "./number-field/sliderMeta";
import { StringField } from "./string-field/StringField";
import { AutocompleteStringField } from "./string-field/AutocompleteStringField";

const passiveEffectTargetSuggestions = [
    "self.state.",
    "self.powerSink.baseDemand.",
];

export const renderStringField = (
    props: FieldProps,
    fieldProps: FieldProps,
    description?: string,
): React.ReactNode => {
    if (description?.includes("ui:icon")) {
        return (
            <IconPicker
                label={props.label}
                filename={props.filename}
                path={props.path}
                schema={props.schema}
            />
        );
    }
    if (description?.includes("ui:autocomplete:passive-effect-target")) {
        return (
            <AutocompleteStringField
                {...fieldProps}
                suggestions={passiveEffectTargetSuggestions}
            />
        );
    }
    return <StringField {...fieldProps} />;
};

export const renderNumberField = (
    fieldProps: FieldProps,
    description?: string,
): React.ReactNode => {
    if (description?.includes("ui:slider")) {
        const sliderMeta = parseSliderMeta(description);
        if (sliderMeta) {
            return <SliderField {...fieldProps} sliderMeta={sliderMeta} />;
        }
    }
    return <NumberField {...fieldProps} />;
};
