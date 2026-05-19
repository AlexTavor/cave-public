import React from "react";
import { Select } from "../../fields/Shared.styles";
import { DisplayEditorField } from "./DisplayEditorField";

type AttributePoolValue = "body" | "mind" | "social";

export const DisplayEditorAttributePoolFields: React.FC<{
    controlId: string;
    attribute: AttributePoolValue;
    onChange(attribute: AttributePoolValue): void;
}> = ({ controlId, attribute, onChange }) => (
    <DisplayEditorField
        controlId={controlId}
        label="Attribute"
        tooltip="Choose which attribute pool this display represents."
    >
        <Select
            id={controlId}
            value={attribute}
            onChange={(e) => onChange(e.target.value as AttributePoolValue)}
        >
            <option value="body">body</option>
            <option value="mind">mind</option>
            <option value="social">social</option>
        </Select>
    </DisplayEditorField>
);
