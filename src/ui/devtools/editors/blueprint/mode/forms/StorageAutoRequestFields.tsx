import React from "react";
import { z } from "zod";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { FieldContainer, Input, Label } from "../../../fields/Shared.styles";
import { useStringField } from "../../../fields/string-field/useStringField";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";

interface StorageAutoRequestFieldsProps {
    filename: string;
    basePath: string;
}

const SourceField: React.FC<{
    filename: string;
    path: string;
}> = ({ filename, path }) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );

    return (
        <FieldContainer>
            <SmartTooltip content="Entity ID or tag selector to request from. Defaults to tag:storage:[resource].">
                <Label>Source</Label>
            </SmartTooltip>
            <Input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
        </FieldContainer>
    );
};

export const StorageAutoRequestFields: React.FC<
    StorageAutoRequestFieldsProps
> = ({ filename, basePath }) => (
    <>
        <BooleanField
            label="Auto-Request"
            schema={z.boolean()}
            filename={filename}
            path={`${basePath}.enabled`}
            tooltip="If enabled, automatically requests resources to keep storage full."
        />
        <NumberField
            label="Cadence (s)"
            schema={z.number().positive()}
            filename={filename}
            path={`${basePath}.cadence_s`}
            tooltip="How often (in seconds) to check and request."
        />
        <SourceField filename={filename} path={`${basePath}.source`} />
        <NumberField
            label="Min Request"
            schema={z.number().nonnegative()}
            filename={filename}
            path={`${basePath}.minRequest`}
            tooltip="Do not request if the shortfall is below this amount."
        />
        <NumberField
            label="Max Request"
            schema={z.number().positive()}
            filename={filename}
            path={`${basePath}.maxRequest`}
            tooltip="Cap the request amount to this value."
        />
    </>
);
