import React from "react";
import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";
import { Select } from "../../fields/Shared.styles";
import { DisplayEditorField } from "./DisplayEditorField";

export const DisplayEditorTypeField: React.FC<{
    controlId: string;
    value: ModuleDisplayAsset["type"];
    onChange(type: ModuleDisplayAsset["type"]): void;
}> = ({ controlId, value, onChange }) => (
    <DisplayEditorField
        controlId={controlId}
        label="Type"
        tooltip="Select the authored display variant for this asset."
    >
        <Select
            id={controlId}
            value={value}
            onChange={(e) =>
                onChange(e.target.value as ModuleDisplayAsset["type"])
            }
        >
            <option value="resource">Resource</option>
            <option value="attribute_pool">Attribute Pool</option>
            <option value="body">Body</option>
        </Select>
    </DisplayEditorField>
);
