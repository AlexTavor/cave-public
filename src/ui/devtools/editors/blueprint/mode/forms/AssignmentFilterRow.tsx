import React from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { MultiAutocompleteStringArrayField } from "./atoms/MultiAutocompleteStringArrayField";

const kindSchema = z.enum(["required_habiti_all", "required_traits_all"]);

export const AssignmentFilterRow: React.FC<{
    filename: string;
    path: string;
    index: number;
    suggestions: string[];
    onDelete: () => void;
}> = ({ filename, path, index, suggestions, onDelete }) => (
    <ComponentRow
        title={`Filter ${index + 1}`}
        titleTooltip="Edit one assignment filter row."
        defaultOpen={index === 0}
        onDelete={onDelete}
        deleteLabel="Remove Filter"
    >
        <EnumField
            label="Kind"
            schema={kindSchema}
            filename={filename}
            path={`${path}.kind`}
            tooltip="Choose whether this row requires matching habiti or traits."
        />
        <MultiAutocompleteStringArrayField
            filename={filename}
            path={`${path}.ids`}
            label="Ids"
            suggestions={suggestions}
            tooltip="Every listed id must be present for a candidate body to pass this row."
        />
    </ComponentRow>
);
