import React from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { NumberField } from "../../../fields/number-field/NumberField";

const kindSchema = z.enum(["attribute_total", "body_count", "level_total"]);
const attributeSchema = z.enum(["body", "mind", "social"]);

export const AssignmentMinimumRow: React.FC<{
    filename: string;
    path: string;
    index: number;
    kind: string;
    onDelete: () => void;
}> = ({ filename, path, index, kind, onDelete }) => (
    <ComponentRow
        title={`Minimum ${index + 1}`}
        titleTooltip="Edit one assignment minimum rule."
        defaultOpen={index === 0}
        onDelete={onDelete}
        deleteLabel="Remove Minimum"
    >
        <EnumField
            label="Kind"
            schema={kindSchema}
            filename={filename}
            path={`${path}.kind`}
            tooltip="Choose whether this row checks assigned body count, total level, or one attribute total."
        />
        {kind === "attribute_total" ? (
            <EnumField
                label="Attribute"
                schema={attributeSchema}
                filename={filename}
                path={`${path}.attribute`}
                tooltip="Attribute to total across assigned bodies."
            />
        ) : null}
        <NumberField
            label="Required"
            schema={z.number()}
            filename={filename}
            path={`${path}.required`}
            tooltip="Minimum total required for this row to be satisfied."
        />
    </ComponentRow>
);
